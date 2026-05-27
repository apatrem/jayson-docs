use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Component, Path, PathBuf},
};

use serde::Serialize;

use super::types::{IpcError, IpcResult};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::Manager;

const MAX_BINARY_FILE_BYTES: u64 = 5_242_880;

#[derive(Debug, Serialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
pub async fn read_yaml_file(app: tauri::AppHandle, path: String) -> IpcResult<String> {
    let roots = asset_scope_roots(&app);
    read_yaml_file_from_path(&path, &roots)
}

#[tauri::command]
pub async fn write_yaml_file(
    app: tauri::AppHandle,
    path: String,
    content: String,
) -> IpcResult<()> {
    let roots = asset_scope_roots(&app);
    write_yaml_file_to_path(&path, &content, &roots)
}

#[tauri::command]
pub async fn read_binary_file(app: tauri::AppHandle, path: String) -> IpcResult<String> {
    let roots = asset_scope_roots(&app);
    read_binary_file_from_path(&path, &roots)
}

#[tauri::command]
pub async fn list_directory(
    app: tauri::AppHandle,
    path: String,
) -> IpcResult<Vec<DirectoryEntry>> {
    let roots = asset_scope_roots(&app);
    list_directory_at_path(&path, &roots)
}

#[tauri::command]
pub async fn file_exists(app: tauri::AppHandle, path: String) -> IpcResult<bool> {
    let roots = asset_scope_roots(&app);
    file_exists_at_path(&path, &roots)
}

#[tauri::command]
pub async fn ensure_directory(app: tauri::AppHandle, path: String) -> IpcResult<()> {
    let roots = asset_scope_roots(&app);
    ensure_directory_at_path(&path, &roots)
}

#[tauri::command]
pub async fn move_file(app: tauri::AppHandle, src: String, dst: String) -> IpcResult<()> {
    let roots = asset_scope_roots(&app);
    move_file_at_path(&src, &dst, &roots)
}

fn read_yaml_file_from_path(path: &str, allowed_roots: &[PathBuf]) -> IpcResult<String> {
    let path = canonical_read_target(path, allowed_roots)?;
    fs::read_to_string(path).map_err(|e| IpcError::Io(e.to_string()))
}

fn read_binary_file_from_path(path: &str, allowed_roots: &[PathBuf]) -> IpcResult<String> {
    let path = canonical_scoped_read_target(
        path,
        allowed_roots,
        // SAFETY: SVG is only returned for export as an <img src="data:..."> payload.
        // Revisit this allowlist before using SVG via <object>, <iframe>, or raw HTML.
        &["jpg", "jpeg", "png", "svg", "webp"],
    )?;
    let metadata = fs::metadata(&path).map_err(|e| IpcError::Io(e.to_string()))?;
    if metadata.len() > MAX_BINARY_FILE_BYTES {
        return Err(IpcError::Invalid(
            "file exceeds 5MB export limit".to_string(),
        ));
    }
    let bytes = fs::read(path).map_err(|e| IpcError::Io(e.to_string()))?;
    Ok(STANDARD.encode(&bytes))
}

fn write_yaml_file_to_path(path: &str, content: &str, allowed_roots: &[PathBuf]) -> IpcResult<()> {
    let path = canonical_write_target(path, allowed_roots)?;
    let parent = path
        .parent()
        .ok_or_else(|| IpcError::Invalid("path must have a parent directory".to_string()))?;
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| IpcError::Invalid("path must have a valid file name".to_string()))?;
    let tmp_path = parent.join(format!("{file_name}.tmp"));

    let write_result = (|| -> IpcResult<()> {
        let mut tmp_file = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(&tmp_path)
            .map_err(|e| IpcError::Io(e.to_string()))?;
        tmp_file
            .write_all(content.as_bytes())
            .map_err(|e| IpcError::Io(e.to_string()))?;
        tmp_file
            .sync_all()
            .map_err(|e| IpcError::Io(e.to_string()))?;
        drop(tmp_file);

        rename_tmp_file(&tmp_path, &path)?;
        sync_parent_directory(parent)?;
        Ok(())
    })();

    if write_result.is_err() {
        let _ = fs::remove_file(&tmp_path);
    }

    write_result
}

fn list_directory_at_path(path: &str, allowed_roots: &[PathBuf]) -> IpcResult<Vec<DirectoryEntry>> {
    let raw_path = validate_absolute_path(path)?;
    let canonical = raw_path
        .canonicalize()
        .map_err(|e| map_path_error(e, path.to_string()))?;
    ensure_path_in_scope(&canonical, allowed_roots)?;

    let mut entries = Vec::new();
    for entry_result in fs::read_dir(&canonical).map_err(|e| IpcError::Io(e.to_string()))? {
        let entry = entry_result.map_err(|e| IpcError::Io(e.to_string()))?;
        let meta =
            fs::symlink_metadata(entry.path()).map_err(|e| IpcError::Io(e.to_string()))?;
        if meta.file_type().is_symlink() {
            continue;
        }
        entries.push(DirectoryEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
        });
    }
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

fn file_exists_at_path(path: &str, allowed_roots: &[PathBuf]) -> IpcResult<bool> {
    let raw_path = validate_absolute_path(path)?;
    match raw_path.canonicalize() {
        Ok(canonical) => {
            ensure_path_in_scope(&canonical, allowed_roots)?;
            Ok(true)
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            let canonical_ancestor = find_canonical_ancestor(&raw_path)?;
            ensure_path_in_scope(&canonical_ancestor, allowed_roots)?;
            Ok(false)
        }
        Err(e) => Err(IpcError::Io(e.to_string())),
    }
}

fn ensure_directory_at_path(path: &str, allowed_roots: &[PathBuf]) -> IpcResult<()> {
    let raw_path = validate_absolute_path(path)?;
    let canonical_ancestor = find_canonical_ancestor(&raw_path)?;
    ensure_path_in_scope(&canonical_ancestor, allowed_roots)?;
    fs::create_dir_all(&raw_path).map_err(|e| IpcError::Io(e.to_string()))?;
    // Post-creation canonical check catches symlink-based scope escapes.
    let canonical = raw_path
        .canonicalize()
        .map_err(|e| IpcError::Io(e.to_string()))?;
    ensure_path_in_scope(&canonical, allowed_roots)
}

fn move_file_at_path(src: &str, dst: &str, allowed_roots: &[PathBuf]) -> IpcResult<()> {
    let src_raw = validate_absolute_path(src)?;
    let dst_raw = validate_absolute_path(dst)?;
    let canonical_src = src_raw
        .canonicalize()
        .map_err(|e| map_path_error(e, src.to_string()))?;
    ensure_path_in_scope(&canonical_src, allowed_roots)?;
    let dst_parent = dst_raw
        .parent()
        .ok_or_else(|| IpcError::Invalid("destination must have a parent directory".to_string()))?;
    let canonical_dst_parent = dst_parent
        .canonicalize()
        .map_err(|e| map_path_error(e, dst_parent.to_string_lossy().to_string()))?;
    let dst_file_name = dst_raw
        .file_name()
        .ok_or_else(|| IpcError::Invalid("destination must have a file name".to_string()))?;
    let canonical_dst = canonical_dst_parent.join(dst_file_name);
    ensure_path_in_scope(&canonical_dst, allowed_roots)?;
    rename_tmp_file(&canonical_src, &canonical_dst)
}

/// Validates that a path is absolute and contains no `..` components.
/// Does not require a specific extension — used for directory paths.
fn validate_absolute_path(path: &str) -> IpcResult<PathBuf> {
    let path = PathBuf::from(path);
    if !path.is_absolute() {
        return Err(IpcError::Invalid("path must be absolute".to_string()));
    }
    if path
        .components()
        .any(|c| matches!(c, Component::ParentDir))
    {
        return Err(IpcError::Invalid("paths must not contain '..'".to_string()));
    }
    Ok(path)
}

/// Walks up the path tree to find the deepest existing ancestor and returns its
/// canonical form. Used to scope-check paths that don't exist yet (e.g., before
/// `ensure_directory` creates them).
fn find_canonical_ancestor(path: &Path) -> IpcResult<PathBuf> {
    let mut candidate = path.to_path_buf();
    loop {
        match candidate.canonicalize() {
            Ok(canonical) => return Ok(canonical),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                match candidate.parent().map(|p| p.to_path_buf()) {
                    Some(parent) if parent != candidate => {
                        candidate = parent;
                    }
                    _ => {
                        return Err(IpcError::PermissionDenied(
                            "path is outside configured asset scope".to_string(),
                        ));
                    }
                }
            }
            Err(e) => return Err(IpcError::Io(e.to_string())),
        }
    }
}

fn canonical_read_target(path: &str, allowed_roots: &[PathBuf]) -> IpcResult<PathBuf> {
    canonical_scoped_read_target(path, allowed_roots, &["yaml", "yml"]).map_err(|err| match err {
        IpcError::Invalid(message) if message == "path extension is not allowed" => {
            IpcError::Invalid("path must end with .yaml or .yml".to_string())
        }
        other => other,
    })
}

fn canonical_scoped_read_target(
    path: &str,
    allowed_roots: &[PathBuf],
    allowed_extensions: &[&str],
) -> IpcResult<PathBuf> {
    let raw_path = validate_scoped_path(path, allowed_extensions)?;
    let canonical_path = raw_path
        .canonicalize()
        .map_err(|e| map_path_error(e, path.to_string()))?;
    if !has_allowed_extension(&canonical_path, allowed_extensions) {
        return Err(IpcError::Invalid(
            "canonical path extension is not allowed".to_string(),
        ));
    }
    ensure_path_in_scope(&canonical_path, allowed_roots)?;
    Ok(canonical_path)
}

fn canonical_write_target(path: &str, allowed_roots: &[PathBuf]) -> IpcResult<PathBuf> {
    let raw_path = validate_yaml_target_path(path)?;
    let parent = raw_path
        .parent()
        .ok_or_else(|| IpcError::Invalid("path must have a parent directory".to_string()))?;
    let canonical_parent = parent
        .canonicalize()
        .map_err(|e| map_path_error(e, parent.to_string_lossy().to_string()))?;
    let file_name = raw_path
        .file_name()
        .ok_or_else(|| IpcError::Invalid("path must have a valid file name".to_string()))?;
    let target = canonical_parent.join(file_name);
    ensure_path_in_scope(&target, allowed_roots)?;
    Ok(target)
}

fn validate_yaml_target_path(path: &str) -> IpcResult<PathBuf> {
    validate_scoped_path(path, &["yaml", "yml"]).map_err(|err| match err {
        IpcError::Invalid(message) if message == "path extension is not allowed" => {
            IpcError::Invalid("path must end with .yaml or .yml".to_string())
        }
        other => other,
    })
}

fn validate_scoped_path(path: &str, allowed_extensions: &[&str]) -> IpcResult<PathBuf> {
    let path = PathBuf::from(path);
    if !path.is_absolute() {
        return Err(IpcError::Invalid("path must be absolute".to_string()));
    }
    if path
        .components()
        .any(|component| matches!(component, Component::ParentDir))
    {
        return Err(IpcError::Invalid("paths must not contain '..'".to_string()));
    }
    if !has_allowed_extension(&path, allowed_extensions) {
        return Err(IpcError::Invalid(
            "path extension is not allowed".to_string(),
        ));
    }
    Ok(path)
}

fn has_allowed_extension(path: &Path, allowed_extensions: &[&str]) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            let extension = extension.to_ascii_lowercase();
            allowed_extensions
                .iter()
                .any(|allowed| extension == *allowed)
        })
        .unwrap_or(false)
}

fn ensure_path_in_scope(path: &Path, allowed_roots: &[PathBuf]) -> IpcResult<()> {
    let canonical_roots = allowed_roots
        .iter()
        .filter_map(|root| root.canonicalize().ok())
        .collect::<Vec<_>>();

    if canonical_roots.iter().any(|root| path.starts_with(root)) {
        return Ok(());
    }

    Err(IpcError::PermissionDenied(
        "path is outside configured asset scope".to_string(),
    ))
}

fn asset_scope_roots(app: &tauri::AppHandle) -> Vec<PathBuf> {
    scope_roots_from_patterns(
        app.config()
            .app
            .security
            .asset_protocol
            .scope
            .allowed_paths(),
        |path| app.path().parse(path),
    )
}

fn scope_roots_from_patterns<F, E>(patterns: &[PathBuf], mut parse_pattern: F) -> Vec<PathBuf>
where
    F: FnMut(&Path) -> Result<PathBuf, E>,
{
    patterns
        .iter()
        .filter_map(|pattern| parse_pattern(pattern).ok())
        .filter_map(root_from_scope_pattern)
        .collect()
}

fn root_from_scope_pattern(pattern: PathBuf) -> Option<PathBuf> {
    let mut root = PathBuf::new();
    for component in pattern.components() {
        if let Component::Normal(part) = component {
            if part.to_string_lossy().contains('*') {
                break;
            }
        }
        root.push(component.as_os_str());
    }
    if root.as_os_str().is_empty() {
        None
    } else {
        Some(root)
    }
}

#[cfg(not(windows))]
fn rename_tmp_file(tmp_path: &Path, target_path: &Path) -> IpcResult<()> {
    fs::rename(tmp_path, target_path).map_err(|e| IpcError::Io(e.to_string()))
}

#[cfg(windows)]
fn rename_tmp_file(tmp_path: &Path, target_path: &Path) -> IpcResult<()> {
    use std::{iter::once, os::windows::ffi::OsStrExt};

    const MOVEFILE_REPLACE_EXISTING: u32 = 0x0000_0001;
    const MOVEFILE_WRITE_THROUGH: u32 = 0x0000_0008;

    #[link(name = "kernel32")]
    extern "system" {
        fn MoveFileExW(
            existing_file_name: *const u16,
            new_file_name: *const u16,
            flags: u32,
        ) -> i32;
    }

    fn encode_path(path: &Path) -> Vec<u16> {
        path.as_os_str().encode_wide().chain(once(0)).collect()
    }

    let existing_file_name = encode_path(tmp_path);
    let new_file_name = encode_path(target_path);
    let flags = MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH;
    let replaced =
        unsafe { MoveFileExW(existing_file_name.as_ptr(), new_file_name.as_ptr(), flags) };

    if replaced == 0 {
        Err(IpcError::Io(std::io::Error::last_os_error().to_string()))
    } else {
        Ok(())
    }
}

#[cfg(unix)]
fn sync_parent_directory(parent: &Path) -> IpcResult<()> {
    File::open(parent)
        .and_then(|directory| directory.sync_all())
        .map_err(|e| IpcError::Io(e.to_string()))
}

#[cfg(not(unix))]
fn sync_parent_directory(_parent: &Path) -> IpcResult<()> {
    Ok(())
}

fn map_path_error(error: std::io::Error, path: String) -> IpcError {
    if error.kind() == std::io::ErrorKind::NotFound {
        IpcError::NotFound(path)
    } else {
        IpcError::Io(error.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unique_test_dir(name: &str) -> std::path::PathBuf {
        let dir =
            std::env::temp_dir().join(format!("docsystem-fs-test-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create test dir");
        dir
    }

    #[test]
    fn reads_yaml_inside_allowed_scope() {
        let root = unique_test_dir("read-allowed");
        let path = root.join("doc.yaml");
        std::fs::write(&path, "kind: document\n").expect("write fixture");

        let content = read_yaml_file_from_path(path.to_str().unwrap(), &[root.clone()])
            .expect("read allowed yaml");

        assert_eq!(content, "kind: document\n");
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_read_outside_allowed_scope() {
        let root = unique_test_dir("read-root");
        let outside = unique_test_dir("read-outside").join("doc.yaml");
        std::fs::write(&outside, "kind: document\n").expect("write fixture");

        let err = read_yaml_file_from_path(outside.to_str().unwrap(), &[root.clone()])
            .expect_err("outside scope should fail");

        assert!(matches!(err, IpcError::PermissionDenied(_)));
        let _ = std::fs::remove_dir_all(root);
        let _ = std::fs::remove_dir_all(outside.parent().unwrap());
    }

    #[test]
    fn atomically_writes_yaml_inside_allowed_scope() {
        let root = unique_test_dir("write-allowed");
        let path = root.join("doc.yaml");

        write_yaml_file_to_path(path.to_str().unwrap(), "kind: document\n", &[root.clone()])
            .expect("write allowed yaml");

        assert_eq!(
            std::fs::read_to_string(&path).expect("read written file"),
            "kind: document\n"
        );
        assert!(
            !root.join("doc.yaml.tmp").exists(),
            "successful atomic write should not leave the sibling tmp file behind"
        );
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_write_with_parent_directory_escape() {
        let root = unique_test_dir("write-escape");
        let path = root.join("../escaped.yaml");

        let err = write_yaml_file_to_path(path.to_str().unwrap(), "x: y\n", &[root.clone()])
            .expect_err("parent directory escape should fail");

        assert!(matches!(err, IpcError::Invalid(_)));
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(windows)]
    #[test]
    fn windows_rename_replaces_existing_target_without_backup_swap() {
        let root = unique_test_dir("windows-rename-replace");
        let target = root.join("doc.yaml");
        let tmp = root.join("doc.yaml.tmp");
        let backup = root.join("doc.yaml.bak");
        std::fs::write(&target, "original\n").expect("write original target");
        std::fs::write(&tmp, "replacement\n").expect("write replacement tmp");

        rename_tmp_file(&tmp, &target).expect("replace existing target");

        assert_eq!(
            std::fs::read_to_string(&target).expect("read replaced target"),
            "replacement\n"
        );
        assert!(
            !tmp.exists(),
            "successful replacement should move the tmp file into the target path"
        );
        assert!(
            !backup.exists(),
            "Windows replacement must not use a sibling backup swap"
        );
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(not(windows))]
    #[test]
    fn windows_replace_existing_test_is_cfg_gated() {
        // The replacement implementation is Windows-specific; the real test
        // runs on the Windows CI job.
        assert!(cfg!(not(windows)));
    }

    #[test]
    fn reads_binary_inside_allowed_scope() {
        let root = unique_test_dir("binary-allowed");
        let path = root.join("image.png");
        std::fs::write(&path, [0x89, b'P', b'N', b'G']).expect("write fixture");

        let encoded = read_binary_file_from_path(path.to_str().unwrap(), &[root.clone()])
            .expect("read allowed binary");

        assert_eq!(encoded, "iVBORw==");
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_oversized_binary_files() {
        let root = unique_test_dir("binary-oversized");
        let path = root.join("too-large.jpg");
        std::fs::write(&path, vec![0_u8; (MAX_BINARY_FILE_BYTES + 1) as usize])
            .expect("write oversized fixture");

        let err = read_binary_file_from_path(path.to_str().unwrap(), &[root.clone()])
            .expect_err("oversized binary should fail");

        assert!(
            matches!(err, IpcError::Invalid(message) if message == "file exceeds 5MB export limit")
        );
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_binary_read_outside_allowed_scope() {
        let root = unique_test_dir("binary-root");
        let outside = unique_test_dir("binary-outside").join("image.webp");
        std::fs::write(&outside, [1, 2, 3]).expect("write fixture");

        let err = read_binary_file_from_path(outside.to_str().unwrap(), &[root.clone()])
            .expect_err("outside binary should fail");

        assert!(matches!(err, IpcError::PermissionDenied(_)));
        let _ = std::fs::remove_dir_all(root);
        let _ = std::fs::remove_dir_all(outside.parent().unwrap());
    }

    #[test]
    fn rejects_wrong_binary_extensions() {
        let root = unique_test_dir("binary-extension");
        for name in ["notes.txt", "doc.yaml", "no-extension"] {
            let path = root.join(name);
            std::fs::write(&path, [1, 2, 3]).expect("write fixture");
            let err = read_binary_file_from_path(path.to_str().unwrap(), &[root.clone()])
                .expect_err("wrong extension should fail");
            assert!(matches!(err, IpcError::Invalid(_)));
        }
        let _ = std::fs::remove_dir_all(root);
    }

    #[cfg(unix)]
    #[test]
    fn rejects_binary_symlink_to_disallowed_canonical_extension() {
        let root = unique_test_dir("binary-symlink-extension");
        let target = root.join("secret.yaml");
        let link = root.join("safe.png");
        std::fs::write(&target, "secret: value\n").expect("write yaml target");
        std::os::unix::fs::symlink(&target, &link).expect("create symlink");

        let err = read_binary_file_from_path(link.to_str().unwrap(), &[root.clone()])
            .expect_err("canonical symlink target extension should fail");

        assert!(
            matches!(err, IpcError::Invalid(message) if message == "canonical path extension is not allowed")
        );
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn yaml_read_wrapper_still_rejects_non_yaml_paths() {
        let root = unique_test_dir("yaml-wrapper-extension");
        let path = root.join("image.png");
        std::fs::write(&path, [1, 2, 3]).expect("write fixture");

        let err = canonical_read_target(path.to_str().unwrap(), &[root.clone()])
            .expect_err("YAML wrapper should reject image extensions");

        assert!(
            matches!(err, IpcError::Invalid(message) if message == "path must end with .yaml or .yml")
        );
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn asset_scope_roots_match_tauri_conf() {
        let conf: serde_json::Value =
            serde_json::from_str(include_str!("../../tauri.conf.json")).expect("parse tauri conf");
        let scope = conf["app"]["security"]["assetProtocol"]["scope"]
            .as_array()
            .expect("assetProtocol.scope array")
            .iter()
            .map(|value| PathBuf::from(value.as_str().expect("scope entry string")))
            .collect::<Vec<_>>();
        let home = PathBuf::from("/home/docsystem-test");
        let app_config = PathBuf::from("/config/docsystem-test");

        let roots = scope_roots_from_patterns(&scope, |pattern| {
            expand_scope_pattern_for_test(pattern, &home, &app_config)
        });
        let expected_roots = [
            home.join("Dropbox"),
            home.join("Library/Mobile Documents"),
            home.join("Google Drive"),
            home.join("OneDrive"),
            home.join("Documents"),
            home.join("Consultancy-Shared"),
            app_config,
        ];

        assert_eq!(roots.len(), expected_roots.len());
        for required in &expected_roots {
            assert!(
                roots.contains(required),
                "asset scope roots should include {}",
                required.display()
            );
        }
        for root in roots {
            assert!(
                expected_roots.contains(&root),
                "asset scope roots should not include undeclared addition {}",
                root.display()
            );
        }
    }

    fn expand_scope_pattern_for_test(
        pattern: &Path,
        home: &Path,
        app_config: &Path,
    ) -> Result<PathBuf, ()> {
        let pattern = pattern.to_string_lossy();
        if let Some(rest) = pattern.strip_prefix("$HOME/") {
            Ok(home.join(rest))
        } else if pattern == "$HOME" {
            Ok(home.to_path_buf())
        } else if let Some(rest) = pattern.strip_prefix("$APPCONFIG/") {
            Ok(app_config.join(rest))
        } else if pattern == "$APPCONFIG" {
            Ok(app_config.to_path_buf())
        } else {
            Ok(PathBuf::from(pattern.as_ref()))
        }
    }

    // --- T-125: tests for newly hardened commands ---

    #[test]
    fn list_directory_returns_entries_in_scope() {
        let root = unique_test_dir("list-dir-allowed");
        std::fs::write(root.join("a.yaml"), "x: 1\n").unwrap();
        std::fs::create_dir(root.join("subdir")).unwrap();

        let entries = list_directory_at_path(root.to_str().unwrap(), &[root.clone()])
            .expect("list allowed directory");

        assert_eq!(entries.len(), 2);
        assert!(entries.iter().any(|e| e.name == "a.yaml" && !e.is_dir));
        assert!(entries.iter().any(|e| e.name == "subdir" && e.is_dir));
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn list_directory_skips_symlinks() {
        let root = unique_test_dir("list-dir-symlink");
        let real_file = root.join("real.yaml");
        std::fs::write(&real_file, "x: 1\n").unwrap();

        #[cfg(unix)]
        {
            let link = root.join("link.yaml");
            std::os::unix::fs::symlink(&real_file, &link).unwrap();
            let entries = list_directory_at_path(root.to_str().unwrap(), &[root.clone()])
                .expect("list with symlink present");
            assert!(
                !entries.iter().any(|e| e.name == "link.yaml"),
                "symlinks must be excluded from directory listing"
            );
        }
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn list_directory_rejects_outside_scope() {
        let root = unique_test_dir("list-dir-root");
        let outside = unique_test_dir("list-dir-outside");

        let err = list_directory_at_path(outside.to_str().unwrap(), &[root.clone()])
            .expect_err("outside-scope list should fail");
        assert!(matches!(err, IpcError::PermissionDenied(_)));
        let _ = std::fs::remove_dir_all(&root);
        let _ = std::fs::remove_dir_all(&outside);
    }

    #[test]
    fn file_exists_returns_true_for_existing_path() {
        let root = unique_test_dir("file-exists-true");
        let file = root.join("doc.yaml");
        std::fs::write(&file, "x: 1\n").unwrap();

        assert!(
            file_exists_at_path(file.to_str().unwrap(), &[root.clone()])
                .expect("file_exists on real file")
        );
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn file_exists_returns_false_for_missing_path() {
        let root = unique_test_dir("file-exists-false");

        assert!(
            !file_exists_at_path(root.join("missing.yaml").to_str().unwrap(), &[root.clone()])
                .expect("file_exists on missing file")
        );
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn file_exists_rejects_outside_scope() {
        let root = unique_test_dir("file-exists-scope-root");
        let outside = unique_test_dir("file-exists-scope-outside");
        let probe = outside.join("secret.yaml");
        std::fs::write(&probe, "x: 1\n").unwrap();

        let err = file_exists_at_path(probe.to_str().unwrap(), &[root.clone()])
            .expect_err("outside-scope file_exists should fail");
        assert!(matches!(err, IpcError::PermissionDenied(_)));
        let _ = std::fs::remove_dir_all(&root);
        let _ = std::fs::remove_dir_all(&outside);
    }

    #[test]
    fn ensure_directory_creates_nested_dirs() {
        let root = unique_test_dir("ensure-dir-create");
        let target = root.join("a").join("b").join("c");

        ensure_directory_at_path(target.to_str().unwrap(), &[root.clone()])
            .expect("ensure_directory creates nested path");
        assert!(target.is_dir());
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn ensure_directory_is_idempotent() {
        let root = unique_test_dir("ensure-dir-idempotent");
        let target = root.join("existing");
        std::fs::create_dir(&target).unwrap();

        ensure_directory_at_path(target.to_str().unwrap(), &[root.clone()])
            .expect("ensure_directory on existing dir is a no-op");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn ensure_directory_rejects_outside_scope() {
        let root = unique_test_dir("ensure-dir-scope-root");
        let outside = unique_test_dir("ensure-dir-scope-outside");
        let target = outside.join("new-subdir");

        let err = ensure_directory_at_path(target.to_str().unwrap(), &[root.clone()])
            .expect_err("outside-scope ensure_directory should fail");
        assert!(matches!(err, IpcError::PermissionDenied(_)));
        let _ = std::fs::remove_dir_all(&root);
        let _ = std::fs::remove_dir_all(&outside);
    }

    #[test]
    fn move_file_renames_within_scope() {
        let root = unique_test_dir("move-file-ok");
        let src = root.join("source.yaml");
        let dst = root.join("target.yaml");
        std::fs::write(&src, "x: moved\n").unwrap();

        move_file_at_path(src.to_str().unwrap(), dst.to_str().unwrap(), &[root.clone()])
            .expect("move within scope");

        assert!(!src.exists(), "source must no longer exist after move");
        assert_eq!(std::fs::read_to_string(&dst).unwrap(), "x: moved\n");
        let _ = std::fs::remove_dir_all(&root);
    }

    #[test]
    fn move_file_rejects_src_outside_scope() {
        let root = unique_test_dir("move-src-root");
        let outside = unique_test_dir("move-src-outside");
        let src = outside.join("doc.yaml");
        let dst = root.join("doc.yaml");
        std::fs::write(&src, "x: 1\n").unwrap();

        let err = move_file_at_path(src.to_str().unwrap(), dst.to_str().unwrap(), &[root.clone()])
            .expect_err("src outside scope must fail");
        assert!(matches!(err, IpcError::PermissionDenied(_)));
        let _ = std::fs::remove_dir_all(&root);
        let _ = std::fs::remove_dir_all(&outside);
    }

    #[test]
    fn move_file_rejects_dst_outside_scope() {
        let root = unique_test_dir("move-dst-root");
        let outside = unique_test_dir("move-dst-outside");
        let src = root.join("doc.yaml");
        let dst = outside.join("doc.yaml");
        std::fs::write(&src, "x: 1\n").unwrap();
        std::fs::create_dir_all(&outside).unwrap();

        let err = move_file_at_path(src.to_str().unwrap(), dst.to_str().unwrap(), &[root.clone()])
            .expect_err("dst outside scope must fail");
        assert!(matches!(err, IpcError::PermissionDenied(_)));
        let _ = std::fs::remove_dir_all(&root);
        let _ = std::fs::remove_dir_all(&outside);
    }
}

use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Component, Path, PathBuf},
};

use super::types::{IpcError, IpcResult};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::Manager;

const MAX_BINARY_FILE_BYTES: u64 = 5_242_880;

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
}

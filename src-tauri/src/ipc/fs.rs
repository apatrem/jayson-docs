use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::{Component, Path, PathBuf},
};

use super::types::{IpcError, IpcResult};
use serde::Serialize;
use tauri::Manager;

const MAX_BINARY_FILE_BYTES: u64 = 5_242_880;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    name: String,
    path: String,
    kind: String,
    is_yaml: bool,
    is_doc_folder: bool,
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
pub async fn read_binary_file(app: tauri::AppHandle, path: String) -> IpcResult<Vec<u8>> {
    let roots = asset_scope_roots(&app);
    read_binary_file_from_path(&path, &roots)
}

#[tauri::command]
pub async fn list_directory(path: String) -> IpcResult<Vec<DirEntry>> {
    let path = validate_path(&path)?;
    let entries = std::fs::read_dir(path).map_err(|e| IpcError::Io(e.to_string()))?;
    let mut out = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| IpcError::Io(e.to_string()))?;
        let file_type = entry.file_type().map_err(|e| IpcError::Io(e.to_string()))?;
        let name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path();
        let is_yaml = name.ends_with(".yaml") || name.ends_with(".yml");
        let is_doc_folder = file_type.is_dir() && contains_yaml_file(&path);
        out.push(DirEntry {
            name,
            path: path.to_string_lossy().to_string(),
            kind: if file_type.is_dir() {
                "directory"
            } else {
                "file"
            }
            .to_string(),
            is_yaml,
            is_doc_folder,
        });
    }

    Ok(out)
}

#[tauri::command]
pub async fn file_exists(path: String) -> IpcResult<bool> {
    Ok(validate_path(&path).map(|p| p.exists()).unwrap_or(false))
}

#[tauri::command]
pub async fn ensure_directory(path: String) -> IpcResult<()> {
    std::fs::create_dir_all(validate_path(&path)?).map_err(|e| IpcError::Io(e.to_string()))
}

#[tauri::command]
pub async fn move_file(from: String, to: String) -> IpcResult<()> {
    std::fs::rename(validate_path(&from)?, validate_path(&to)?)
        .map_err(|e| IpcError::Io(e.to_string()))
}

fn validate_path(path: &str) -> IpcResult<PathBuf> {
    if path.contains("..") {
        return Err(IpcError::Invalid("paths must not contain '..'".to_string()));
    }
    Ok(PathBuf::from(path))
}

fn contains_yaml_file(path: &Path) -> bool {
    fs::read_dir(path)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .any(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            name.ends_with(".yaml") || name.ends_with(".yml")
        })
}

fn read_yaml_file_from_path(path: &str, allowed_roots: &[PathBuf]) -> IpcResult<String> {
    let path = canonical_read_target(path, allowed_roots)?;
    fs::read_to_string(path).map_err(|e| IpcError::Io(e.to_string()))
}

fn read_binary_file_from_path(path: &str, allowed_roots: &[PathBuf]) -> IpcResult<Vec<u8>> {
    let path =
        canonical_scoped_read_target(path, allowed_roots, &["jpg", "jpeg", "png", "svg", "webp"])?;
    let metadata = fs::metadata(&path).map_err(|e| IpcError::Io(e.to_string()))?;
    if metadata.len() > MAX_BINARY_FILE_BYTES {
        return Err(IpcError::Invalid(
            "file exceeds 5MB export limit".to_string(),
        ));
    }
    fs::read(path).map_err(|e| IpcError::Io(e.to_string()))
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
            allowed_extensions.iter().any(|allowed| extension == *allowed)
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
    let mut roots = Vec::new();

    if let Some(home) = home_dir() {
        roots.extend(
            [
                "Dropbox",
                "Library/Mobile Documents",
                "Google Drive",
                "OneDrive",
                "Documents",
                "Consultancy-Shared",
            ]
            .into_iter()
            .map(|relative| home.join(relative)),
        );
    }

    if let Ok(app_config_dir) = app.path().app_config_dir() {
        roots.push(app_config_dir);
    }

    roots
}

fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

fn rename_tmp_file(tmp_path: &Path, target_path: &Path) -> IpcResult<()> {
    #[cfg(windows)]
    if target_path.exists() {
        fs::remove_file(target_path).map_err(|e| IpcError::Io(e.to_string()))?;
    }

    fs::rename(tmp_path, target_path).map_err(|e| IpcError::Io(e.to_string()))
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

    #[test]
    fn reads_binary_inside_allowed_scope() {
        let root = unique_test_dir("binary-allowed");
        let path = root.join("image.png");
        std::fs::write(&path, [0x89, b'P', b'N', b'G']).expect("write fixture");

        let bytes = read_binary_file_from_path(path.to_str().unwrap(), &[root.clone()])
            .expect("read allowed binary");

        assert_eq!(bytes, vec![0x89, b'P', b'N', b'G']);
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

        assert!(matches!(err, IpcError::Invalid(message) if message == "file exceeds 5MB export limit"));
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

    #[test]
    fn yaml_read_wrapper_still_rejects_non_yaml_paths() {
        let root = unique_test_dir("yaml-wrapper-extension");
        let path = root.join("image.png");
        std::fs::write(&path, [1, 2, 3]).expect("write fixture");

        let err = canonical_read_target(path.to_str().unwrap(), &[root.clone()])
            .expect_err("YAML wrapper should reject image extensions");

        assert!(matches!(err, IpcError::Invalid(message) if message == "path must end with .yaml or .yml"));
        let _ = std::fs::remove_dir_all(root);
    }
}

use serde::Serialize;

use super::types::{IpcError, IpcResult};

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
pub async fn read_yaml_file(path: String) -> IpcResult<String> {
    std::fs::read_to_string(validate_path(&path)?).map_err(|e| IpcError::Io(e.to_string()))
}

#[tauri::command]
pub async fn write_yaml_file(path: String, content: String) -> IpcResult<()> {
    let path = validate_path(&path)?;
    std::fs::write(path, content).map_err(|e| IpcError::Io(e.to_string()))
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
            kind: if file_type.is_dir() { "directory" } else { "file" }.to_string(),
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

fn validate_path(path: &str) -> IpcResult<std::path::PathBuf> {
    if path.contains("..") {
        return Err(IpcError::Invalid("paths must not contain '..'".to_string()));
    }
    Ok(std::path::PathBuf::from(path))
}

fn contains_yaml_file(path: &std::path::Path) -> bool {
    std::fs::read_dir(path)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .any(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            name.ends_with(".yaml") || name.ends_with(".yml")
        })
}

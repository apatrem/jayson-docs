use tauri::Manager;

use super::types::{IpcError, IpcResult};

#[tauri::command]
pub async fn read_app_config(app: tauri::AppHandle) -> IpcResult<serde_json::Value> {
    let path = config_path(&app)?;
    let raw = std::fs::read_to_string(path).map_err(|e| IpcError::Io(e.to_string()))?;
    serde_json::from_str(&raw).map_err(|e| IpcError::Invalid(e.to_string()))
}

#[tauri::command]
pub async fn write_app_config(app: tauri::AppHandle, config: serde_json::Value) -> IpcResult<()> {
    let path = config_path(&app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| IpcError::Io(e.to_string()))?;
    }
    let raw =
        serde_json::to_string_pretty(&config).map_err(|e| IpcError::Invalid(e.to_string()))?;
    std::fs::write(path, raw).map_err(|e| IpcError::Io(e.to_string()))
}

#[tauri::command]
pub async fn get_config_dir(app: tauri::AppHandle) -> IpcResult<String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| IpcError::Internal(e.to_string()))?
        .to_string_lossy()
        .to_string())
}

fn config_path(app: &tauri::AppHandle) -> IpcResult<std::path::PathBuf> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| IpcError::Internal(e.to_string()))?
        .join("config.json"))
}

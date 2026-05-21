use super::types::{IpcError, IpcResult};

#[tauri::command]
pub async fn get_secret(name: String) -> IpcResult<String> {
    let entry =
        keyring::Entry::new("docsystem", &name).map_err(|e| IpcError::Internal(e.to_string()))?;
    entry.get_password().map_err(|e| match e {
        keyring::Error::NoEntry => IpcError::NotFound(name),
        _ => IpcError::Internal(e.to_string()),
    })
}

#[tauri::command]
pub async fn set_secret(name: String, value: String) -> IpcResult<()> {
    let entry =
        keyring::Entry::new("docsystem", &name).map_err(|e| IpcError::Internal(e.to_string()))?;
    entry
        .set_password(&value)
        .map_err(|e| IpcError::Internal(e.to_string()))
}

#[tauri::command]
pub async fn delete_secret(name: String) -> IpcResult<()> {
    let entry =
        keyring::Entry::new("docsystem", &name).map_err(|e| IpcError::Internal(e.to_string()))?;
    entry.delete_credential().map_err(|e| match e {
        keyring::Error::NoEntry => IpcError::NotFound(name),
        _ => IpcError::Internal(e.to_string()),
    })
}

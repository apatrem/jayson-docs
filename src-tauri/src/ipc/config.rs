// D-110: YAML on disk (config.yaml), JSON over IPC.
// read_app_config parses YAML → serde_json::Value for the JS schema validators.
// write_app_config takes serde_json::Value from JS and serializes to YAML.
use std::{
    fs::{self, File, OpenOptions},
    io::Write,
    path::Path,
};

use tauri::Manager;

use super::types::{IpcError, IpcResult};

#[tauri::command]
pub async fn read_app_config(app: tauri::AppHandle) -> IpcResult<serde_json::Value> {
    let path = config_path(&app)?;
    let raw = fs::read_to_string(&path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            IpcError::NotFound(path.to_string_lossy().to_string())
        } else {
            IpcError::Io(e.to_string())
        }
    })?;
    serde_yaml::from_str::<serde_json::Value>(&raw)
        .map_err(|e| IpcError::Invalid(e.to_string()))
}

#[tauri::command]
pub async fn write_app_config(app: tauri::AppHandle, config: serde_json::Value) -> IpcResult<()> {
    let path = config_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| IpcError::Io(e.to_string()))?;
    }
    let yaml =
        serde_yaml::to_string(&config).map_err(|e| IpcError::Invalid(e.to_string()))?;
    // Atomic write-then-rename (same pattern as write_yaml_file in fs.rs).
    let tmp_path = path.with_extension("yaml.tmp");
    let write_result = (|| -> IpcResult<()> {
        let mut tmp = OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(&tmp_path)
            .map_err(|e| IpcError::Io(e.to_string()))?;
        tmp.write_all(yaml.as_bytes())
            .map_err(|e| IpcError::Io(e.to_string()))?;
        tmp.sync_all().map_err(|e| IpcError::Io(e.to_string()))?;
        drop(tmp);
        rename_config_tmp(&tmp_path, &path)
    })();
    if write_result.is_err() {
        let _ = fs::remove_file(&tmp_path);
    }
    write_result
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
        .join("config.yaml"))
}

#[cfg(not(windows))]
fn rename_config_tmp(tmp_path: &Path, target_path: &Path) -> IpcResult<()> {
    fs::rename(tmp_path, target_path).map_err(|e| IpcError::Io(e.to_string()))
}

#[cfg(windows)]
fn rename_config_tmp(tmp_path: &Path, target_path: &Path) -> IpcResult<()> {
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

    let src = encode_path(tmp_path);
    let dst = encode_path(target_path);
    let flags = MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH;
    let ok = unsafe { MoveFileExW(src.as_ptr(), dst.as_ptr(), flags) };
    if ok == 0 {
        Err(IpcError::Io(std::io::Error::last_os_error().to_string()))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn unique_test_dir(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir()
            .join(format!("docsystem-config-test-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("create test dir");
        dir
    }

    fn fake_config_path(dir: &std::path::Path) -> std::path::PathBuf {
        dir.join("config.yaml")
    }

    fn read_config_from_path(path: &std::path::Path) -> IpcResult<serde_json::Value> {
        let raw = fs::read_to_string(path).map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                IpcError::NotFound(path.to_string_lossy().to_string())
            } else {
                IpcError::Io(e.to_string())
            }
        })?;
        serde_yaml::from_str::<serde_json::Value>(&raw)
            .map_err(|e| IpcError::Invalid(e.to_string()))
    }

    fn write_config_to_path(path: &std::path::Path, config: serde_json::Value) -> IpcResult<()> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| IpcError::Io(e.to_string()))?;
        }
        let yaml =
            serde_yaml::to_string(&config).map_err(|e| IpcError::Invalid(e.to_string()))?;
        let tmp_path = path.with_extension("yaml.tmp");
        let write_result = (|| -> IpcResult<()> {
            let mut tmp = OpenOptions::new()
                .create(true)
                .truncate(true)
                .write(true)
                .open(&tmp_path)
                .map_err(|e| IpcError::Io(e.to_string()))?;
            tmp.write_all(yaml.as_bytes())
                .map_err(|e| IpcError::Io(e.to_string()))?;
            tmp.sync_all().map_err(|e| IpcError::Io(e.to_string()))?;
            drop(tmp);
            rename_config_tmp(&tmp_path, path)
        })();
        if write_result.is_err() {
            let _ = fs::remove_file(&tmp_path);
        }
        write_result
    }

    #[test]
    fn roundtrip_yaml_config() {
        let dir = unique_test_dir("roundtrip");
        let path = fake_config_path(&dir);
        let config = json!({
            "schemaVersion": "0.1.0",
            "paths": { "cloudSyncRoot": "/Users/me/Dropbox/Docs" }
        });

        write_config_to_path(&path, config.clone()).expect("write config");
        let read_back = read_config_from_path(&path).expect("read config back");

        assert_eq!(read_back, config);
        assert!(path.exists(), "config.yaml must exist on disk");
        assert!(
            !dir.join("config.yaml.tmp").exists(),
            "no leftover tmp file after successful write"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn config_file_is_yaml_on_disk() {
        let dir = unique_test_dir("yaml-on-disk");
        let path = fake_config_path(&dir);
        let config = json!({ "paths": { "cloudSyncRoot": "/foo" } });

        write_config_to_path(&path, config).expect("write config");

        let raw = fs::read_to_string(&path).expect("read raw bytes");
        assert!(
            raw.contains("cloudSyncRoot:"),
            "on-disk format must be YAML, got: {raw}"
        );
        assert!(
            !raw.trim_start().starts_with('{'),
            "on-disk format must NOT be JSON"
        );
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn read_config_returns_not_found_for_missing_file() {
        let dir = unique_test_dir("not-found");
        let path = fake_config_path(&dir);

        let err = read_config_from_path(&path).expect_err("missing config must err");
        assert!(matches!(err, IpcError::NotFound(_)));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn read_config_returns_invalid_for_malformed_yaml() {
        let dir = unique_test_dir("malformed");
        let path = fake_config_path(&dir);
        fs::write(&path, b": bad\tyaml: [unclosed").expect("write malformed");

        let err = read_config_from_path(&path).expect_err("malformed yaml must err");
        assert!(matches!(err, IpcError::Invalid(_)));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn write_config_is_atomic_no_tmp_left_on_success() {
        let dir = unique_test_dir("atomic");
        let path = fake_config_path(&dir);

        write_config_to_path(&path, json!({ "x": 1 })).expect("write");

        assert!(path.exists());
        assert!(!dir.join("config.yaml.tmp").exists());
        let _ = std::fs::remove_dir_all(&dir);
    }

}

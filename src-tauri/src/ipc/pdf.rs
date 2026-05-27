use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::types::{IpcError, IpcResult};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfExportInput {
    pub html: String,
    pub suggested_name: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportHandoff {
    kind: &'static str,
    path: String,
}

#[tauri::command]
pub async fn export_pdf(html: String, suggested_name: String) -> IpcResult<ExportHandoff> {
    export_pdf_to_root(
        PdfExportInput {
            html,
            suggested_name,
        },
        &export_temp_root(),
    )
}

pub fn cleanup_export_temp_dir() -> std::io::Result<()> {
    cleanup_export_temp_dir_at(&export_temp_root())
}

fn export_pdf_to_root(input: PdfExportInput, root: &Path) -> IpcResult<ExportHandoff> {
    fs::create_dir_all(root).map_err(|e| IpcError::Io(e.to_string()))?;
    let canonical_root = root
        .canonicalize()
        .map_err(|e| IpcError::Io(e.to_string()))?;
    let export_dir = canonical_root.join(Uuid::new_v4().to_string());
    fs::create_dir_all(&export_dir).map_err(|e| IpcError::Io(e.to_string()))?;

    let file_path = export_dir.join(sanitize_suggested_name(&input.suggested_name));
    fs::write(&file_path, input.html).map_err(|e| IpcError::Io(e.to_string()))?;
    let canonical_file = file_path
        .canonicalize()
        .map_err(|e| IpcError::Io(e.to_string()))?;

    if !canonical_file.starts_with(&canonical_root) {
        let _ = fs::remove_file(&canonical_file);
        return Err(IpcError::PermissionDenied(
            "export path escaped the temp export root".to_string(),
        ));
    }

    Ok(ExportHandoff {
        kind: "browser_handoff",
        path: canonical_file.to_string_lossy().to_string(),
    })
}

fn cleanup_export_temp_dir_at(root: &Path) -> std::io::Result<()> {
    match fs::symlink_metadata(root) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            log::warn!(
                "skipping export temp cleanup because {} is a symlink",
                root.display()
            );
        }
        Ok(_) => {
            // Defense-in-depth (T-123p): before `remove_dir_all`, prune any
            // top-level child that is itself a symlink so we never traverse
            // into the target's filesystem. `remove_dir_all` already refuses
            // to follow root-level symlinks (handled above), but the per-OS
            // recursion behavior for nested symlinks is documented as
            // implementation-defined and may change between Rust versions.
            // Removing the symlink entry by name (not by metadata) breaks
            // only the link, leaving any target tree intact.
            for entry in fs::read_dir(root)? {
                let entry = entry?;
                let entry_metadata = fs::symlink_metadata(entry.path())?;
                if entry_metadata.file_type().is_symlink() {
                    log::warn!(
                        "removing symlink {} inside export temp root before recursive delete",
                        entry.path().display()
                    );
                    fs::remove_file(entry.path())?;
                }
            }
            fs::remove_dir_all(root)?;
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error),
    }
    Ok(())
}

fn export_temp_root() -> PathBuf {
    std::env::temp_dir().join("docsystem-export")
}

fn sanitize_suggested_name(suggested_name: &str) -> String {
    let trimmed = suggested_name.trim();
    let without_pdf = if trimmed.to_ascii_lowercase().ends_with(".pdf") {
        &trimmed[..trimmed.len().saturating_sub(4)]
    } else {
        trimmed
    };
    let sanitized = without_pdf
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | ' ' | '-') {
                ch
            } else {
                '_'
            }
        })
        .collect::<String>();
    let stripped = sanitized.trim_start_matches('.').trim();
    let base = if stripped.is_empty() {
        "document"
    } else {
        stripped
    };
    let clamped = base.chars().take(200).collect::<String>();
    format!("{clamped}.html")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unique_test_dir(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("docsystem-pdf-test-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn writes_temp_html_handoff_inside_export_root() {
        let root = unique_test_dir("happy");
        let handoff = export_pdf_to_root(
            PdfExportInput {
                html: "<!doctype html><html><body>ok</body></html>".to_string(),
                suggested_name: "Proposal.pdf".to_string(),
            },
            &root,
        )
        .expect("export handoff");

        assert_eq!(handoff.kind, "browser_handoff");
        assert!(handoff.path.ends_with("Proposal.html"));
        assert!(Path::new(&handoff.path).starts_with(root.canonicalize().unwrap()));
        assert_eq!(
            fs::read_to_string(&handoff.path).expect("read handoff html"),
            "<!doctype html><html><body>ok</body></html>"
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_unusable_temp_root() {
        let root = unique_test_dir("not-directory");
        fs::write(&root, "not a directory").expect("write root file");

        let err = export_pdf_to_root(
            PdfExportInput {
                html: "<html></html>".to_string(),
                suggested_name: "doc.pdf".to_string(),
            },
            &root,
        )
        .expect_err("file root should fail");

        assert!(matches!(err, IpcError::Io(_)));
        let _ = fs::remove_file(root);
    }

    #[test]
    fn sanitizes_suggested_name_and_strips_pdf_suffix() {
        let sanitized = sanitize_suggested_name("../.Proposal:Q3?.PDF");

        assert_eq!(sanitized, "_.Proposal_Q3_.html");
        assert!(!sanitized.ends_with(".pdf.html"));
        assert!(!sanitized.contains('/'));
    }

    #[test]
    fn cleanup_export_temp_dir_removes_existing_root() {
        let root = unique_test_dir("cleanup");
        fs::create_dir_all(root.join("old-export")).expect("create old export");

        cleanup_export_temp_dir_at(&root).expect("cleanup root");

        assert!(!root.exists());
    }

    #[cfg(unix)]
    #[test]
    fn cleanup_export_temp_dir_skips_symlink_root() {
        let target = unique_test_dir("cleanup-symlink-target");
        fs::create_dir_all(&target).expect("create symlink target");
        fs::write(target.join("keep.txt"), "keep").expect("write target file");
        let root = unique_test_dir("cleanup-symlink-root");
        let _ = fs::remove_file(&root);
        std::os::unix::fs::symlink(&target, &root).expect("create root symlink");

        cleanup_export_temp_dir_at(&root).expect("cleanup symlink root");

        assert!(target.join("keep.txt").exists());
        assert!(root.exists());
        let _ = fs::remove_file(root);
        let _ = fs::remove_dir_all(target);
    }

    #[cfg(unix)]
    #[test]
    fn cleanup_export_temp_dir_unlinks_nested_symlink_without_touching_target() {
        // T-123p: a nested symlink inside the export temp root must be
        // unlinked by name only — the target it points to must stay intact.
        let target = unique_test_dir("nested-symlink-target");
        fs::create_dir_all(&target).expect("create symlink target dir");
        fs::write(target.join("precious.txt"), "must-survive").expect("write target file");

        let root = unique_test_dir("nested-symlink-root");
        fs::create_dir_all(&root).expect("create root dir");
        fs::create_dir_all(root.join("export-1")).expect("create real subdir");
        fs::write(root.join("export-1").join("doc.html"), "<html/>").expect("write real file");
        std::os::unix::fs::symlink(&target, root.join("innocent-symlink"))
            .expect("create nested symlink");

        cleanup_export_temp_dir_at(&root).expect("cleanup nested symlink root");

        assert!(!root.exists(), "root should be removed");
        assert!(target.exists(), "target directory must be untouched");
        assert!(
            target.join("precious.txt").exists(),
            "files inside the symlink target must survive cleanup"
        );
        let _ = fs::remove_dir_all(target);
    }
}

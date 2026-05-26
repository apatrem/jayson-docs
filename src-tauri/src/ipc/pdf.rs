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
pub async fn export_pdf(input: PdfExportInput) -> IpcResult<ExportHandoff> {
    export_pdf_to_root(input, &export_temp_root())
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
    if root.exists() {
        fs::remove_dir_all(root)?;
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
}

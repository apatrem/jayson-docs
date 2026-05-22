use serde::Deserialize;

use super::types::IpcResult;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfExportInput {
    pub html_path: String,
    pub output_path: String,
    pub options: PdfExportOptions,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PdfExportOptions {
    pub format: String,
    pub orientation: String,
    pub header_template: Option<String>,
    pub footer_template: Option<String>,
    pub margins: PdfMargins,
    pub display_header_footer: bool,
}

#[derive(Debug, Deserialize)]
pub struct PdfMargins {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

#[tauri::command]
pub async fn export_pdf(input: PdfExportInput) -> IpcResult<()> {
    let _ = input;
    Ok(())
}

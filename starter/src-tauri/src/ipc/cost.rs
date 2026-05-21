use serde::{Deserialize, Serialize};

use super::types::IpcResult;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CostLedgerRowInput {
    pub timestamp: String,
    pub model: String,
    pub provider: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cached_tokens: i64,
    pub computed_cost_usd: f64,
    pub doc_id: Option<String>,
    pub call_kind: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CostSummary {
    current_month_usd: f64,
    rolling_30_day_usd: f64,
}

#[tauri::command]
pub async fn insert_cost_row(row: CostLedgerRowInput) -> IpcResult<()> {
    let _ = row;
    Ok(())
}

#[tauri::command]
pub async fn get_cost_summary() -> IpcResult<CostSummary> {
    Ok(CostSummary {
        current_month_usd: 0.0,
        rolling_30_day_usd: 0.0,
    })
}

#[tauri::command]
pub async fn clear_cost_history() -> IpcResult<()> {
    Ok(())
}

#[tauri::command]
pub async fn prune_old_rows(retention_days: i64) -> IpcResult<i64> {
    let _ = retention_days;
    Ok(0)
}

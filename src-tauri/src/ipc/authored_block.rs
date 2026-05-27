//! IPC commands for Authored-block receive-time operations (T-163).
//!
//! Exposes the Rust lint (src-tauri/src/lint/) as a Tauri command callable
//! from the TypeScript frontend via the IPC client in src/ipc/authored-block.ts.

use crate::lint;
use serde::Serialize;

/// The result type returned to the TypeScript caller.
/// Mirrors AuthoredBlockLintResult in src/ipc/authored-block.ts.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthoredBlockLintResult {
    pub ok: bool,
    pub violations: Vec<LintViolationDto>,
    pub extracted_manifest: Option<serde_json::Value>,
}

/// A single violation, serialised with camelCase keys for the TS client.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LintViolationDto {
    pub rule: String,
    pub message: String,
    pub line: u32,
    pub column: u32,
}

impl From<lint::LintViolation> for LintViolationDto {
    fn from(v: lint::LintViolation) -> Self {
        Self {
            rule: v.rule,
            message: v.message,
            line: v.line,
            column: v.column,
        }
    }
}

/// Lints an Authored block source file using the Rust AST parser.
///
/// Called from the TypeScript client in src/ipc/authored-block.ts via
/// `invoke("lint_authored_block", { source })`.
///
/// The source is parsed with `swc_ecma_parser` (ADR-0014) and checked against
/// the A001-A013 rule set (src/blocks/authored/lint-rules.ts).
#[tauri::command]
pub fn lint_authored_block(source: String) -> AuthoredBlockLintResult {
    let result = lint::lint_authored_source(&source);
    AuthoredBlockLintResult {
        ok: result.ok,
        violations: result.violations.into_iter().map(Into::into).collect(),
        extracted_manifest: result.extracted_manifest,
    }
}

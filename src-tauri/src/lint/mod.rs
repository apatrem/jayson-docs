//! Authored-block lint at receive time (T-163, ADR-0013, ADR-0014).
//!
//! This module implements the A001-A013 rule set using `swc_ecma_parser` to
//! parse the received `.tsx` source without executing it.  It is scoped to
//! `src-tauri/src/lint/` as required by ADR-0014.
//!
//! The rule constants are the same A0xx identifiers used by the TypeScript
//! lint in `src/setup/lint-authored.ts` and declared in
//! `src/blocks/authored/lint-rules.ts`.

mod runner;
#[cfg(test)]
mod tests;

use serde::{Deserialize, Serialize};

// ─── Public types ─────────────────────────────────────────────────────────────

/// A single violation found by the Authored-block lint.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LintViolation {
    /// A0xx rule identifier (matches lint-rules.ts and src/setup/lint-authored.ts).
    pub rule: String,
    /// Human-readable description of the violation.
    pub message: String,
    /// 1-based line number in the source file.
    pub line: u32,
    /// 0-based column number in the source file.
    pub column: u32,
}

/// Result of linting an Authored block source file.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LintResult {
    /// True when no A001-A013 violations were found.
    pub ok: bool,
    /// Ordered list of violations (empty when ok).
    pub violations: Vec<LintViolation>,
    /// Manifest data extracted from the AST when lint passes; null otherwise.
    pub extracted_manifest: Option<serde_json::Value>,
}

// ─── Public entry point ───────────────────────────────────────────────────────

/// Lints an Authored block source string against the A001-A013 rule set.
///
/// This is the Rust half of the "both lints agree" CI gate — the TypeScript
/// half is `lintAuthoredBlockSource()` in `src/setup/lint-authored.ts`.
///
/// Both halves run against the shared fixtures in
/// `tests/blocks/authored/fixtures/` and must produce identical pass/fail.
pub fn lint_authored_source(source: &str) -> LintResult {
    runner::run(source)
}

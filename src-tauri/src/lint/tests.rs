//! Rust-side fixture tests for the Authored-block lint (T-163).
//!
//! These are the Rust half of the "both lints agree" CI gate.
//! The TypeScript half is in tests/blocks/authored/lint-agreement.test.ts.
//!
//! Each test reads a fixture from tests/blocks/authored/fixtures/ and checks
//! that the Rust lint produces the expected pass/fail result. CI runs both
//! test suites; if both pass, the two lints "agree" on every fixture.

use super::lint_authored_source;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Returns the path to a fixture file relative to the workspace root.
/// Rust tests run from the crate root (src-tauri/), so we go up one level.
fn fixture_path(subdir: &str, name: &str) -> std::path::PathBuf {
    std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("tests")
        .join("blocks")
        .join("authored")
        .join("fixtures")
        .join(subdir)
        .join(name)
}

fn read_fixture(subdir: &str, name: &str) -> String {
    let path = fixture_path(subdir, name);
    std::fs::read_to_string(&path)
        .unwrap_or_else(|e| panic!("failed to read fixture {subdir}/{name}: {e}"))
}

// ─── Valid fixtures ───────────────────────────────────────────────────────────

#[test]
fn valid_minimal_has_no_violations() {
    let source = read_fixture("valid", "minimal.ts");
    let result = lint_authored_source(&source);
    assert!(
        result.ok,
        "valid/minimal.ts should have no violations, got: {:?}",
        result.violations
    );
    assert!(result.violations.is_empty());
}

// ─── Invalid fixtures ─────────────────────────────────────────────────────────

#[test]
fn invalid_a002_react_import_fails() {
    let source = read_fixture("invalid", "a002-react-import.ts");
    let result = lint_authored_source(&source);
    assert!(!result.ok, "a002-react-import.ts should fail lint");
    let rule_ids: Vec<&str> = result.violations.iter().map(|v| v.rule.as_str()).collect();
    assert!(
        rule_ids.contains(&"A002-no-extra-imports"),
        "expected A002-no-extra-imports violation, got: {rule_ids:?}"
    );
}

#[test]
fn invalid_a005_arrow_fn_fails() {
    let source = read_fixture("invalid", "a005-arrow-fn.ts");
    let result = lint_authored_source(&source);
    assert!(!result.ok, "a005-arrow-fn.ts should fail lint");
    let rule_ids: Vec<&str> = result.violations.iter().map(|v| v.rule.as_str()).collect();
    assert!(
        rule_ids.contains(&"A005-no-function-values"),
        "expected A005-no-function-values violation, got: {rule_ids:?}"
    );
}

#[test]
fn invalid_a010_eval_fails() {
    let source = read_fixture("invalid", "a010-eval.ts");
    let result = lint_authored_source(&source);
    assert!(!result.ok, "a010-eval.ts should fail lint");
    let rule_ids: Vec<&str> = result.violations.iter().map(|v| v.rule.as_str()).collect();
    assert!(
        rule_ids.contains(&"A010-no-dangerous-patterns"),
        "expected A010-no-dangerous-patterns violation, got: {rule_ids:?}"
    );
}

#[test]
fn invalid_a011_no_header_fails() {
    let source = read_fixture("invalid", "a011-no-header.ts");
    let result = lint_authored_source(&source);
    assert!(!result.ok, "a011-no-header.ts should fail lint");
    let rule_ids: Vec<&str> = result.violations.iter().map(|v| v.rule.as_str()).collect();
    assert!(
        rule_ids.contains(&"A011-manifest-header-present"),
        "expected A011-manifest-header-present violation, got: {rule_ids:?}"
    );
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

#[test]
fn empty_source_fails() {
    let result = lint_authored_source("");
    assert!(!result.ok);
    assert!(!result.violations.is_empty());
}

#[test]
fn source_without_header_fails_a011() {
    let source = "import { defineAuthoredBlock } from \"./defineAuthoredBlock\";\nexport default defineAuthoredBlock({ slug: \"x\", title: \"X\", paletteLabel: \"X\", content: \"none\", attrs: [], template: { kind: \"text\", value: \"hi\" } });\n";
    let result = lint_authored_source(source);
    assert!(!result.ok);
    let has_a011 = result.violations.iter().any(|v| v.rule == "A011-manifest-header-present");
    assert!(has_a011, "expected A011 violation");
}

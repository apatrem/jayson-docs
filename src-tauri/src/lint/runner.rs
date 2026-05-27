//! AST walker + rule checker for the Authored-block lint (T-163).
//!
//! Uses `swc_ecma_parser` to parse TypeScript without executing it, then
//! walks the AST to enforce the A001-A013 rule set.

use regex::Regex;
use std::sync::OnceLock;
use swc_common::{sync::Lrc, FileName, SourceMap, Spanned};
use swc_ecma_ast::*;
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax, TsSyntax};
use swc_ecma_visit::{Visit, VisitWith};

use super::{LintResult, LintViolation};

// ─── Regexes ──────────────────────────────────────────────────────────────────

fn header_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"authored-block-header:\s*(\d+)").unwrap())
}

fn slug_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^[a-z][a-z0-9-]*$").unwrap())
}

fn sender_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^[^@:\s]+@[^@:\s]+\.[^@:\s.]+$").unwrap())
}

fn extract_header_field<'a>(source: &'a str, field: &str) -> Option<&'a str> {
    for line in source.lines() {
        let line = line.trim_start_matches(|c: char| c == '*' || c == '/' || c == ' ');
        if let Some(rest) = line.strip_prefix(&format!("{field}:")) {
            return Some(rest.trim());
        }
    }
    None
}

// ─── Forbidden identifiers ────────────────────────────────────────────────────

const FORBIDDEN_IDENTS: &[&str] = &[
    "eval",
    "Function",
    "dangerouslySetInnerHTML",
    "fetch",
    "XMLHttpRequest",
    "__proto__",
    "prototype",
    "constructor",
];

// ─── AST Visitor ─────────────────────────────────────────────────────────────

struct AuthoredLinter {
    violations: Vec<LintViolation>,
    source_map: Lrc<SourceMap>,
}

impl AuthoredLinter {
    fn violation(&self, rule: &str, message: impl Into<String>, span: swc_common::Span) -> LintViolation {
        let loc = self.source_map.lookup_char_pos(span.lo);
        LintViolation {
            rule: rule.to_string(),
            message: message.into(),
            line: loc.line as u32,
            column: loc.col_display as u32,
        }
    }

    fn push(&mut self, rule: &str, message: impl Into<String>, span: swc_common::Span) {
        let v = self.violation(rule, message, span);
        self.violations.push(v);
    }
}

impl Visit for AuthoredLinter {
    // A005: No function expressions
    fn visit_fn_expr(&mut self, n: &FnExpr) {
        self.push(
            "A005-no-function-values",
            "function expression is forbidden inside the manifest",
            n.function.span,
        );
        // Don't recurse into function body — violation already recorded
    }

    // A005: No arrow functions
    fn visit_arrow_expr(&mut self, n: &ArrowExpr) {
        self.push(
            "A005-no-function-values",
            "arrow function is forbidden inside the manifest",
            n.span,
        );
        // Don't recurse
    }

    // A006: No JSX elements
    fn visit_jsx_element(&mut self, n: &JSXElement) {
        self.push(
            "A006-no-jsx",
            "JSX elements are forbidden inside the manifest",
            n.span,
        );
    }

    fn visit_jsx_fragment(&mut self, n: &JSXFragment) {
        self.push(
            "A006-no-jsx",
            "JSX fragments are forbidden inside the manifest",
            n.span,
        );
    }

    // A007: No template literals with expressions
    fn visit_tpl(&mut self, n: &Tpl) {
        if !n.exprs.is_empty() {
            self.push(
                "A007-no-template-literals-with-expressions",
                "template literals with ${...} expressions are forbidden",
                n.span,
            );
        }
        // Still recurse to catch nested issues
        n.visit_children_with(self);
    }

    // A008: No computed property keys
    fn visit_prop(&mut self, n: &Prop) {
        if let Prop::KeyValue(kv) = n {
            if matches!(kv.key, PropName::Computed(_)) {
                self.push(
                    "A008-no-computed-property-keys",
                    "computed property keys are forbidden",
                    kv.key.span(),
                );
            }
        }
        n.visit_children_with(self);
    }

    // A009: Spread only on inline object literals
    fn visit_spread_element(&mut self, n: &SpreadElement) {
        if !matches!(*n.expr, Expr::Object(_)) {
            self.push(
                "A009-no-spread-of-non-literals",
                "spread of an identifier or call is forbidden (only inline objects may be spread)",
                n.dot3_token,
            );
        }
        n.visit_children_with(self);
    }

    // A010: Forbidden identifiers
    fn visit_ident(&mut self, n: &Ident) {
        if FORBIDDEN_IDENTS.contains(&n.sym.as_str()) {
            self.push(
                "A010-no-dangerous-patterns",
                format!("'{}' is a forbidden identifier", n.sym),
                n.span,
            );
        }
    }
}

// ─── Top-level structure checks ───────────────────────────────────────────────

fn check_top_level(module: &Module, violations: &mut Vec<LintViolation>, cm: &Lrc<SourceMap>) {
    let mut export_default_count = 0u32;
    let mut unexpected_statements = 0u32;

    for item in &module.body {
        match item {
            ModuleItem::ModuleDecl(ModuleDecl::Import(import)) => {
                // A002: only allowed import specifiers
                let src = import.src.value.as_str().unwrap_or("<non-utf8>");
                // Authored blocks may only import from defineAuthoredBlock's path
                // (or type-only imports of allowed symbols).
                let is_type_only = import.type_only;
                let specifiers_are_allowed = import.specifiers.is_empty()
                    || import.specifiers.iter().all(|s| match s {
                        ImportSpecifier::Named(named) => {
                            named.is_type_only
                                || matches!(
                                    named.local.sym.as_str(),
                                    "defineAuthoredBlock"
                                        | "AuthoredBlockManifest"
                                        | "AttrFieldDef"
                                        | "RenderNode"
                                        | "AttrRef"
                                        | "ColorToken"
                                )
                        }
                        _ => false,
                    });

                if !is_type_only && !specifiers_are_allowed {
                    let loc = cm.lookup_char_pos(import.span.lo);
                    violations.push(LintViolation {
                        rule: "A002-no-extra-imports".into(),
                        message: format!("import from '{}' is not on the Authored allow-list", src),
                        line: loc.line as u32,
                        column: loc.col_display as u32,
                    });
                }
            }
            ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultExpr(_))
            | ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(_)) => {
                export_default_count += 1;
            }
            other => {
                let span = match other {
                    ModuleItem::Stmt(s) => s.span(),
                    ModuleItem::ModuleDecl(d) => d.span(),
                };
                let loc = cm.lookup_char_pos(span.lo);
                violations.push(LintViolation {
                    rule: "A001-single-default-export".into(),
                    message: format!("unexpected top-level statement — only a default export of defineAuthoredBlock() is allowed"),
                    line: loc.line as u32,
                    column: loc.col_display as u32,
                });
                unexpected_statements += 1;
            }
        }
    }

    if export_default_count == 0 {
        violations.push(LintViolation {
            rule: "A001-single-default-export".into(),
            message: "file must have exactly one default export (defineAuthoredBlock({...}))".into(),
            line: 1,
            column: 0,
        });
    } else if export_default_count > 1 {
        violations.push(LintViolation {
            rule: "A001-single-default-export".into(),
            message: "file must have exactly one default export".into(),
            line: 1,
            column: 0,
        });
    }

    let _ = unexpected_statements; // may use in future
}

// ─── Header checks ────────────────────────────────────────────────────────────

fn check_header(source: &str, violations: &mut Vec<LintViolation>) {
    // A011: must have authored-block-header: 1 in first block comment
    let has_header = header_re().is_match(source);
    if !has_header {
        violations.push(LintViolation {
            rule: "A011-manifest-header-present".into(),
            message: "manifest header missing: no 'authored-block-header: 1' line found".into(),
            line: 1,
            column: 0,
        });
        return;
    }

    // A012: slug must be kebab-case
    if let Some(slug) = extract_header_field(source, "slug") {
        if !slug_re().is_match(slug) {
            violations.push(LintViolation {
                rule: "A012-slug-kebab-case".into(),
                message: format!("slug '{slug}' is not kebab-case"),
                line: 1,
                column: 0,
            });
        }
    } else {
        violations.push(LintViolation {
            rule: "A011-manifest-header-present".into(),
            message: "manifest header missing required field: 'slug'".into(),
            line: 1,
            column: 0,
        });
    }

    // A013: sender must be a valid email
    if let Some(sender) = extract_header_field(source, "sender") {
        if !sender_re().is_match(sender) {
            violations.push(LintViolation {
                rule: "A013-sender-valid-email".into(),
                message: format!("sender '{sender}' is not a syntactically valid email"),
                line: 1,
                column: 0,
            });
        }
    } else {
        violations.push(LintViolation {
            rule: "A011-manifest-header-present".into(),
            message: "manifest header missing required field: 'sender'".into(),
            line: 1,
            column: 0,
        });
    }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

pub fn run(source: &str) -> LintResult {
    let mut violations = Vec::new();

    // Header checks (text-based, no AST needed)
    check_header(source, &mut violations);

    // Parse using SWC
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(
        FileName::Custom("authored-block.ts".into()).into(),
        source.to_string(),
    );
    let lexer = Lexer::new(
        Syntax::Typescript(TsSyntax {
            tsx: false,
            decorators: false,
            no_early_errors: false,
            disallow_ambiguous_jsx_like: false,
            dts: false,
        }),
        Default::default(),
        StringInput::from(&*fm),
        None,
    );
    let mut parser = Parser::new_from(lexer);
    let module = match parser.parse_module() {
        Ok(m) => m,
        Err(_) => {
            violations.push(LintViolation {
                rule: "A001-single-default-export".into(),
                message: "source could not be parsed as valid TypeScript".into(),
                line: 1,
                column: 0,
            });
            return LintResult {
                ok: violations.is_empty(),
                violations,
                extracted_manifest: None,
            };
        }
    };

    // A001 + A002 + A003: top-level structure
    check_top_level(&module, &mut violations, &cm);

    // A004-A010: AST visitor
    let mut linter = AuthoredLinter {
        violations: Vec::new(),
        source_map: cm,
    };
    module.visit_with(&mut linter);
    violations.extend(linter.violations);

    let ok = violations.is_empty();
    LintResult {
        ok,
        violations,
        extracted_manifest: if ok { Some(serde_json::Value::Null) } else { None },
    }
}

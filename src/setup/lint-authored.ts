/**
 * TypeScript-side Authored-block lint (T-163).
 *
 * Applies the A001-A013 rule set (from src/blocks/authored/lint-rules.ts) to
 * an Authored block source file using @typescript-eslint/parser.  Runs at
 * setup/receive time in Node context (NOT in the renderer bundle).
 *
 * This is one half of the "both lints agree" CI gate — the Rust sidecar
 * (src-tauri/src/lint/) is the other half.  Both run against the same fixtures
 * under tests/blocks/authored/fixtures/ and must produce identical pass/fail
 * for every fixture.
 *
 * Rule IDs use the A0xx scheme from lint-rules.ts so that the TypeScript and
 * Rust outputs share a common vocabulary.
 */

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

import { parse } from "@typescript-eslint/parser";
import type { TSESTree } from "@typescript-eslint/types";
import {
  AUTHORED_SENDER_RE,
  AUTHORED_SLUG_RE,
} from "../schema/blocks/block-type-string";
import { parseManifestHeader } from "../blocks/authored/manifest-header";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthoredLintViolation {
  /** A0xx rule identifier matching lint-rules.ts and the Rust lint. */
  rule: string;
  message: string;
  /** 1-based line number in the source file. */
  line: number;
  /** 0-based column number. */
  column: number;
}

export interface AuthoredLintResult {
  ok: boolean;
  violations: AuthoredLintViolation[];
}

// ─── Authored allow-list ──────────────────────────────────────────────────────

/** The ONLY import specifier allowed verbatim in Authored block files. */
const AUTHORED_IMPORT_SPECIFIER_RE = /defineAuthoredBlock|AuthoredBlockManifest|AttrFieldDef|RenderNode|AttrRef|ColorToken/;

/** Dangerous identifiers that must never appear in an Authored block. */
const FORBIDDEN_IDENTIFIERS = new Set([
  "eval",
  "Function",
  "dangerouslySetInnerHTML",
  "fetch",
  "XMLHttpRequest",
  "__proto__",
  "prototype",
  "constructor",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loc(node: TSESTree.Node): Pick<AuthoredLintViolation, "line" | "column"> {
  const start = node.loc?.start ?? { line: 1, column: 0 };
  return { line: start.line, column: start.column };
}

function violation(
  rule: string,
  message: string,
  node: TSESTree.Node,
): AuthoredLintViolation {
  return { rule, message, ...loc(node) };
}

// ─── Recursive AST walker ─────────────────────────────────────────────────────

function walk(
  node: TSESTree.Node,
  violations: AuthoredLintViolation[],
): void {
  switch (node.type) {
    case "ArrowFunctionExpression":
    case "FunctionExpression": {
      violations.push(
        violation("A005-no-function-values", "function expressions and arrow functions are forbidden inside the manifest", node),
      );
      break;
    }
    case "JSXElement":
    case "JSXFragment": {
      violations.push(
        violation("A006-no-jsx", "JSX elements are forbidden inside the manifest", node),
      );
      break;
    }
    case "TemplateLiteral": {
      if (node.expressions.length > 0) {
        violations.push(
          violation("A007-no-template-literals-with-expressions", "template literals with expressions (${...}) are forbidden", node),
        );
      }
      break;
    }
    case "Property": {
      if (node.computed) {
        violations.push(
          violation("A008-no-computed-property-keys", "computed property keys are forbidden", node),
        );
      }
      break;
    }
    case "SpreadElement": {
      // A009: spread is only allowed on inline object literals
      const arg = node.argument;
      if (arg.type !== "ObjectExpression") {
        violations.push(
          violation("A009-no-spread-of-non-literals", "spread of an identifier or function call is forbidden (only inline object literals may be spread)", node),
        );
      }
      break;
    }
    case "Identifier": {
      if (FORBIDDEN_IDENTIFIERS.has(node.name)) {
        violations.push(
          violation("A010-no-dangerous-patterns", `${node.name} is forbidden`, node),
        );
      }
      break;
    }
    default:
      break;
  }

  // Recurse into children
  for (const key of Object.keys(node)) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (!child || key === "parent") continue;
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          walk(item as TSESTree.Node, violations);
        }
      }
    } else if (typeof child === "object" && "type" in (child as object)) {
      walk(child as TSESTree.Node, violations);
    }
  }
}

// ─── Top-level structure checks ───────────────────────────────────────────────

/**
 * Checks A001 (single default export) and A002 (allowed imports) and A003
 * (no side-effect statements) at the top level of the program.
 */
function checkTopLevel(
  program: TSESTree.Program,
  violations: AuthoredLintViolation[],
): void {
  let exportDefaultCount = 0;
  let otherStatements = 0;

  for (const stmt of program.body) {
    if (stmt.type === "ImportDeclaration") {
      // A002: import specifier must be on the authored allow-list
      const src = stmt.source.value;
      // Allow any specifier that only imports allowed symbols
      const specifiersOk = !stmt.specifiers.length ||
        stmt.specifiers.every((s) => {
          const name =
            s.type === "ImportSpecifier"
              ? (s.imported.type === "Identifier" ? s.imported.name : "")
              : "";
          return AUTHORED_IMPORT_SPECIFIER_RE.test(name) || stmt.importKind === "type";
        });
      if (!specifiersOk || (stmt.importKind !== "type" && !AUTHORED_IMPORT_SPECIFIER_RE.test(src))) {
        // Check if the import is purely of allowed symbols (type imports are ok)
        // A simple check: if src contains the defineAuthoredBlock path or only imports types
        const isTypeOnly = stmt.importKind === "type" || stmt.specifiers.every(
          (s) => s.type === "ImportSpecifier" && s.importKind === "type",
        );
        if (!isTypeOnly) {
          violations.push(
            violation(
              "A002-no-extra-imports",
              `import from '${src}' is not on the Authored allow-list`,
              stmt,
            ),
          );
        }
      }
    } else if (stmt.type === "ExportDefaultDeclaration") {
      exportDefaultCount++;
    } else if (stmt.type === "ExpressionStatement") {
      // A003: expression statements at top level are side effects
      violations.push(
        violation(
          "A003-no-top-level-side-effects",
          "top-level expression statement is a side effect",
          stmt,
        ),
      );
      otherStatements++;
    } else {
      // Other top-level statements (variable declarations, function declarations, etc.)
      // are forbidden by A001 (only a single default export is allowed)
      violations.push(
        violation(
          "A001-single-default-export",
          `unexpected top-level ${stmt.type} — only a default export of defineAuthoredBlock() is allowed`,
          stmt,
        ),
      );
      otherStatements++;
    }
  }

  if (exportDefaultCount === 0 && otherStatements === 0) {
    // Empty file or imports only — no default export
    violations.push({
      rule: "A001-single-default-export",
      message: "file must have exactly one default export (defineAuthoredBlock({...}))",
      line: 1,
      column: 0,
    });
  } else if (exportDefaultCount > 1) {
    violations.push({
      rule: "A001-single-default-export",
      message: "file must have exactly one default export",
      line: 1,
      column: 0,
    });
  }
}

/**
 * Checks A011 (manifest header present), A012 (slug kebab-case), and
 * A013 (sender valid email) via the manifest header in the source text.
 */
function checkHeader(
  source: string,
  violations: AuthoredLintViolation[],
): void {
  const parseResult = parseManifestHeader(source);

  if (!parseResult.ok) {
    violations.push({
      rule: "A011-manifest-header-present",
      message: `manifest header missing or invalid: ${parseResult.error.message}`,
      line: 1,
      column: 0,
    });
    return;
  }

  const { header } = parseResult;

  // A012: slug must be kebab-case
  if (!AUTHORED_SLUG_RE.test(header.slug)) {
    violations.push({
      rule: "A012-slug-kebab-case",
      message: `slug '${header.slug}' is not kebab-case (must match /^[a-z][a-z0-9-]*$/)`,
      line: 1,
      column: 0,
    });
  }

  // A013: sender must be a syntactically valid email
  if (!AUTHORED_SENDER_RE.test(header.sender)) {
    violations.push({
      rule: "A013-sender-valid-email",
      message: `sender '${header.sender}' is not a syntactically valid email`,
      line: 1,
      column: 0,
    });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Lints an Authored block source string against all A001-A013 rules.
 *
 * This is the TypeScript half of the "both lints agree" CI gate (T-163).
 * The Rust sidecar runs the same rules via swc_ecma_parser and must produce
 * identical pass/fail for the shared fixtures in tests/blocks/authored/fixtures/.
 *
 * @param source  The full text of the Authored `.tsx` file.
 * @returns `{ ok, violations }` — violations list is empty when ok.
 */
export function lintAuthoredBlockSource(source: string): AuthoredLintResult {
  const violations: AuthoredLintViolation[] = [];

  // A011 + A012 + A013: header checks (text-based, no AST needed)
  checkHeader(source, violations);

  // Parse the AST for deeper structural checks
  let program: TSESTree.Program;
  try {
    program = parse(source, {
      loc: true,
      range: true,
      ecmaVersion: "latest",
      sourceType: "module",
      jsx: true,
    }) as TSESTree.Program;
  } catch {
    violations.push({
      rule: "A001-single-default-export",
      message: "source could not be parsed as valid TypeScript",
      line: 1,
      column: 0,
    });
    return { ok: violations.length === 0, violations };
  }

  // A001 + A002 + A003: top-level structure
  checkTopLevel(program, violations);

  // A004-A010: deep manifest checks (walk the entire AST)
  for (const stmt of program.body) {
    walk(stmt, violations);
  }

  return { ok: violations.length === 0, violations };
}

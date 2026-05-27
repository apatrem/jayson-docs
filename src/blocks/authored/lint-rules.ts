/**
 * Authored-block lint rule constants (ADR-0013).
 *
 * These describe the rules the Rust AST validator (T-163, `swc_ecma_parser`
 * sidecar) enforces on every Authored block file at receive time.  Expressed
 * here as TypeScript constants so T-163 can reference them as the single
 * source of truth rather than duplicating the rule text in Rust.
 *
 * Each rule has an id, description, and the violation it prevents.
 */

export interface LintRule {
  /** Short machine-readable identifier used in diagnostics. */
  readonly id: string;
  /** Human-readable description of what the rule checks. */
  readonly description: string;
  /** What happens if the rule fires: "reject" (quarantine block) or "warn". */
  readonly severity: "reject" | "warn";
}

/**
 * The complete set of lint rules that apply to Authored block files.
 *
 * The Rust AST validator (T-163) runs these in order; the FIRST rejection
 * stops further evaluation and quarantines the block.
 */
export const AUTHORED_BLOCK_LINT_RULES: readonly LintRule[] = [
  // ── File-shape rules ──────────────────────────────────────────────────────

  {
    id: "A001-single-default-export",
    description:
      "File must contain exactly one top-level statement: the default export " +
      "of `defineAuthoredBlock({...})`. No other top-level variable declarations, " +
      "function declarations, or class declarations are permitted.",
    severity: "reject",
  },
  {
    id: "A002-no-extra-imports",
    description:
      "Only `import` statements whose specifier matches the Authored allow-list " +
      "are permitted. Allowed specifiers: `defineAuthoredBlock` helper path, " +
      "type-only imports of `AttrRef`, `ColorToken`, `AuthoredBlockManifest`. " +
      "Forbidden: react, @tiptap/*, echarts, mermaid, fs, path, crypto, fetch, " +
      "XMLHttpRequest, or any relative import outside the allow-list.",
    severity: "reject",
  },
  {
    id: "A003-no-top-level-side-effects",
    description:
      "No expression statements, bare function calls, or side-effectful " +
      "statements may appear at the top level (other than the default-export call).",
    severity: "reject",
  },

  // ── Manifest literal rules ────────────────────────────────────────────────

  {
    id: "A004-static-values-only",
    description:
      "Every value inside the `defineAuthoredBlock({...})` object literal must " +
      "be statically evaluable: string, number, boolean, or null literals; " +
      "array literals of the same; object literals of the same; AttrRef object " +
      "literals (`{ $ref: '<string>' }`); ColorToken object literals " +
      "(`{ $token: '<string>' }`).",
    severity: "reject",
  },
  {
    id: "A005-no-function-values",
    description:
      "No function expressions, arrow functions, method shorthand, or " +
      "async/generator functions may appear anywhere inside the manifest literal.",
    severity: "reject",
  },
  {
    id: "A006-no-jsx",
    description:
      "No JSX elements (`<...>`) or React.createElement() calls may appear " +
      "anywhere inside the manifest literal.",
    severity: "reject",
  },
  {
    id: "A007-no-template-literals-with-expressions",
    description:
      "Template literals are permitted only if they contain no substitution " +
      "expressions (i.e., backtick strings without `${...}`).  Template " +
      "literals with interpolation are rejected.",
    severity: "reject",
  },
  {
    id: "A008-no-computed-property-keys",
    description:
      "No computed property keys (`{ [expr]: value }`) inside the manifest.",
    severity: "reject",
  },
  {
    id: "A009-no-spread-of-non-literals",
    description:
      "Spread syntax (`...expr`) is forbidden unless `expr` is an inline " +
      "object literal.  Spreading an identifier or a function call is rejected.",
    severity: "reject",
  },

  // ── Security invariants ───────────────────────────────────────────────────

  {
    id: "A010-no-dangerous-patterns",
    description:
      "The following identifiers and call patterns are never permitted, even " +
      "in a comment-free context: `eval`, `Function`, `dangerouslySetInnerHTML`, " +
      "`fetch`, `XMLHttpRequest`, `__proto__`, `prototype`, `constructor`.",
    severity: "reject",
  },
  {
    id: "A011-manifest-header-present",
    description:
      "The file's first block comment must be a valid Authored-block manifest " +
      "header (T-161 format) containing at least: scaffold-version, sender, " +
      "timestamp, and slug matching the manifest's slug field.",
    severity: "reject",
  },

  // ── Identity invariants (ADR-0009) ───────────────────────────────────────

  {
    id: "A012-slug-kebab-case",
    description:
      "The `slug` field inside `defineAuthoredBlock({...})` must be a " +
      "kebab-case string matching `/^[a-z][a-z0-9-]*$/`: all lowercase, " +
      "starts with a letter, may contain digits and hyphens, no uppercase " +
      "letters, no underscores, no leading or trailing hyphens.",
    severity: "reject",
  },
  {
    id: "A013-sender-valid-email",
    description:
      "The `sender` field in the manifest header must be a syntactically " +
      "valid email address matching the pattern " +
      "`/^[^@:\\s]+@[^@:\\s]+\\.[^@:\\s.]+$/` (local-part, @, domain, dot, " +
      "TLD — no whitespace, no colons). Semantic deliverability is not " +
      "checked; syntax alone determines validity.",
    severity: "reject",
  },
] as const;

/**
 * The subset of identifiers from the full Standard/Brand allow-list
 * (ADR-0001 + ADR-0006) that are further permitted in Authored block files.
 *
 * Everything NOT on this list is implicitly forbidden by rule A002.
 */
export const AUTHORED_IMPORT_ALLOW_LIST = [
  "defineAuthoredBlock",
  "AttrRef",
  "ColorToken",
  "AuthoredBlockManifest",
  // type-only schema helpers if needed for documentation in generated files:
  "AttrFieldDef",
  "RenderNode",
] as const;

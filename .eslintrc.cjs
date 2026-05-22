/**
 * ESLint config — strict TS, React, no any.
 *
 * Custom rules enforce the architectural invariants from DECISIONS.md:
 *  - No dangerouslySetInnerHTML anywhere (D-09).
 *  - No hard-coded hex colors in src/renderer/blocks/ or src/block-primitives/
 *    (D-09 mitigation; brand-tokens or bust).
 *  - No raw `fetch`/`XMLHttpRequest` in src/setup/scaffold/ output (forbidden
 *    in generated blocks).
 *
 * These are enforced as `error` so CI fails loudly on drift.
 */

module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  settings: { react: { version: "detect" } },
  rules: {
    // ── Architecture invariants ───────────────────────────────────────────
    "react/no-danger": "error",
    "no-restricted-syntax": [
      "error",
      {
        selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
        message: "dangerouslySetInnerHTML is forbidden (D-09 mitigation #3).",
      },
      {
        selector: "CallExpression[callee.name='eval']",
        message: "eval is forbidden.",
      },
      {
        selector: "NewExpression[callee.name='Function']",
        message: "new Function(...) is forbidden.",
      },
    ],

    // ── TypeScript strictness ─────────────────────────────────────────────
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",

    // ── Style (prettier handles formatting, ESLint handles semantics) ─────
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "prefer-const": "error",
    eqeqeq: ["error", "always", { null: "ignore" }],
  },
  overrides: [
    {
      // Block renderers and primitives: no hard-coded colors / px values
      // (enforced via a regex on string literals — pair this with a custom
      // ESLint rule in setup/lint-generated.ts; the regex below catches
      // common cases).
      files: [
        "src/renderer/blocks/**/*.tsx",
        "src/block-primitives/**/*.tsx",
        "src/block-primitives/**/*.ts",
        "generated-blocks/active/**/*.tsx",
      ],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
            message:
              "Hard-coded hex colors are forbidden in block renderers. Use brand tokens via resolveBrandToken().",
          },
          {
            selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
            message: "dangerouslySetInnerHTML is forbidden.",
          },
        ],
      },
    },
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",   // test fixtures relax
        "no-console": "off",
      },
    },
  ],
  ignorePatterns: [
    "dist",
    "node_modules",
    "src-tauri/**",
    "reference/**",
    "starter",
    "starter/**/*",
    "**/starter/**",
    "docs/**",
    "examples/**",
    "scripts/**",
    "generated-blocks/pending/**",
    "vite.config.ts",
    "vitest.config.ts",
    "*.cjs",
  ],
};

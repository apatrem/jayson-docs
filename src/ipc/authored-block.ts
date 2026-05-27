/**
 * TypeScript client for the `lint_authored_block` Tauri IPC command (T-163).
 *
 * The Rust sidecar (`src-tauri/src/lint/`) implements the actual AST lint.
 * This module provides a typed wrapper so callers never import `@tauri-apps/api`
 * directly and can be stubbed in tests.
 */

import { invoke } from "@tauri-apps/api/core";

// ─── Shared types ─────────────────────────────────────────────────────────────

/** A single violation reported by either the TypeScript or Rust lint. */
export interface LintViolation {
  /** A0xx rule identifier (matches lint-rules.ts and src/setup/lint-authored.ts). */
  rule: string;
  /** Human-readable description of the violation. */
  message: string;
  /** 1-based line number in the source file. */
  line: number;
  /** 0-based column number in the source file. */
  column: number;
}

/**
 * Result returned by the Rust sidecar for a given Authored block source file.
 * Mirrors the TypeScript `AuthoredLintResult` from src/setup/lint-authored.ts.
 */
export interface AuthoredBlockLintResult {
  /** True if no A001-A013 violations were found. */
  ok: boolean;
  /** Ordered list of violations (empty when ok). */
  violations: LintViolation[];
  /**
   * The manifest data extracted from the AST if (and only if) lint passed.
   * null when ok is false.
   */
  extractedManifest: Record<string, unknown> | null;
}

// ─── IPC call ─────────────────────────────────────────────────────────────────

/**
 * Sends an Authored block's source to the Rust sidecar for linting.
 *
 * The sidecar runs the A001-A013 rule set (see `src/blocks/authored/lint-rules.ts`)
 * against the source, extracts the manifest data if lint passes, and returns
 * a typed result.
 *
 * @param source  The full text of the received `.tsx` file.
 * Errors from the Tauri runtime (not lint violations) propagate as raw
 * rejection values — use `formatErrorMessage` from `./errors` if you need
 * to display them to the user.
 */
export async function lintAuthoredBlock(
  source: string,
): Promise<AuthoredBlockLintResult> {
  return invoke<AuthoredBlockLintResult>("lint_authored_block", { source });
}

/**
 * TypeScript client for the `lint_authored_block` Tauri IPC command (T-163),
 * and the receive pipeline (T-164) that installs or quarantines Authored blocks.
 *
 * The Rust sidecar (`src-tauri/src/lint/`) implements the actual AST lint.
 * This module provides typed wrappers so callers never import `@tauri-apps/api`
 * directly and can be stubbed in tests.
 */

import { invoke } from "@tauri-apps/api/core";
import { parseManifestHeader } from "../blocks/authored/manifest-header";

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

// ─── Receive pipeline (T-164) ─────────────────────────────────────────────────

/**
 * Outcome of the full receive pipeline for one Authored `.tsx` file.
 */
export interface AuthoredReceiveResult {
  /** True when lint passed and the block was written to `active/`. */
  ok: boolean;
  /** Absolute path where the block was written (active or quarantine). */
  installedPath: string;
  /** Non-empty when `ok` is false — the lint violations that caused quarantine. */
  violations: LintViolation[];
}

/**
 * Runs the full receive-time pipeline for one Authored block `.tsx` file:
 *
 * 1. Lints the source via the Rust sidecar (`lint_authored_block`).
 * 2a. If lint **passes**: writes the file to `{activeDir}/{slug}.tsx` and
 *     writes a sidecar `{slug}.json` with the extracted manifest.
 * 2b. If lint **fails**: writes the file to `{quarantineDir}/{filename}` and
 *     writes a `{filename}.violations.json` sidecar so T-165's quarantine UI
 *     can show failure reasons without re-parsing.
 *
 * Both `activeDir` and `quarantineDir` must already exist or be creatable
 * via `ensure_directory` before calling this function.
 *
 * @param source        Full text of the `.tsx` file.
 * @param filename      Leaf file name (used as the quarantine key when lint fails).
 * @param activeDir     Absolute path to `generated-blocks/active/`.
 * @param quarantineDir Absolute path to `generated-blocks/quarantine/`.
 */
export async function receiveAuthoredBlock(
  source: string,
  filename: string,
  activeDir: string,
  quarantineDir: string,
): Promise<AuthoredReceiveResult> {
  // Step 1 — lint
  const lintResult = await lintAuthoredBlock(source);

  if (lintResult.ok) {
    // Step 2a — install to active/
    // Derive the slug from the manifest header (already validated by lint).
    const parseResult = parseManifestHeader(source);
    const slug = parseResult.ok ? parseResult.header.slug : filename.replace(/\.tsx$/u, "");
    const targetPath = activeDir.endsWith("/")
      ? `${activeDir}${slug}.tsx`
      : `${activeDir}/${slug}.tsx`;

    await invoke("ensure_directory", { path: activeDir });
    await invoke("write_yaml_file", { path: targetPath, content: source });

    // Write a companion sidecar JSON with the extracted manifest so the UI
    // can render palette entries without re-parsing the .tsx source.
    if (lintResult.extractedManifest !== null) {
      const sidecarPath = targetPath.replace(/\.tsx$/u, ".manifest.json");
      await invoke("write_yaml_file", {
        path: sidecarPath,
        content: JSON.stringify(lintResult.extractedManifest, null, 2),
      });
    }

    return { ok: true, installedPath: targetPath, violations: [] };
  } else {
    // Step 2b — quarantine
    const quarantinePath = quarantineDir.endsWith("/")
      ? `${quarantineDir}${filename}`
      : `${quarantineDir}/${filename}`;

    await invoke("ensure_directory", { path: quarantineDir });
    await invoke("write_yaml_file", { path: quarantinePath, content: source });

    // Write a violations sidecar so T-165 can surface reasons without re-linting.
    const sidecarPath = `${quarantinePath}.violations.json`;
    await invoke("write_yaml_file", {
      path: sidecarPath,
      content: JSON.stringify(lintResult.violations, null, 2),
    });

    return { ok: false, installedPath: quarantinePath, violations: lintResult.violations };
  }
}

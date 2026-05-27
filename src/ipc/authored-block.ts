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
 * 2. If lint **passes** — apply the replacement rule (T-170, ADR-0009):
 *    - Parse the incoming manifest header for `{slug}` + `{sender}`.
 *    - Check `active/` and `archived/` for an existing `{slug}.tsx` file with
 *      the same sender → if found, replace in-place (v2 replaces v1).
 *    - If no same-sender match → install to `active/` (new block).
 *    - Writes a `.manifest.json` sidecar alongside every installed `.tsx`.
 * 3. If lint **fails** → quarantine the file with a `.violations.json` sidecar.
 *
 * `activeDir`, `archivedDir`, and `quarantineDir` must already exist or be
 * creatable via `ensure_directory`.
 *
 * @param source        Full text of the `.tsx` file.
 * @param filename      Leaf file name (used as the quarantine key when lint fails).
 * @param activeDir     Absolute path to `generated-blocks/active/`.
 * @param quarantineDir Absolute path to `generated-blocks/quarantine/`.
 * @param archivedDir   Absolute path to `generated-blocks/archived/`.
 *                      Defaults to `active/../archived` when not supplied.
 */
export async function receiveAuthoredBlock(
  source: string,
  filename: string,
  activeDir: string,
  quarantineDir: string,
  archivedDir?: string,
): Promise<AuthoredReceiveResult> {
  // Step 1 — lint
  const lintResult = await lintAuthoredBlock(source);

  if (lintResult.ok) {
    // Derive slug and sender from the manifest header (already validated by lint).
    const parseResult = parseManifestHeader(source);
    const slug = parseResult.ok ? parseResult.header.slug : filename.replace(/\.tsx$/u, "");
    const sender = parseResult.ok ? parseResult.header.sender : null;

    // Step 2 — replacement check (T-170, ADR-0009)
    // Resolve the archived directory (default: sibling of active/).
    const resolvedArchivedDir =
      archivedDir ?? activeDir.replace(/\/active\/?$/, "/archived").replace(/\\active\\?$/, "\\archived");

    // Prefer in-place replacement if a same-sender file already exists.
    const targetPath = sender !== null
      ? await findExistingInstallDir(slug, sender, activeDir, resolvedArchivedDir)
          .then((dir) => {
            if (dir === null) return null;
            const normalized = dir.endsWith("/") ? dir : `${dir}/`;
            return `${normalized}${slug}.tsx`;
          })
      : null;

    const installPath = targetPath ??
      (activeDir.endsWith("/") ? `${activeDir}${slug}.tsx` : `${activeDir}/${slug}.tsx`);

    const installDir = installPath.replace(/\/[^/]+$/, "");

    await invoke("ensure_directory", { path: installDir });
    await invoke("write_yaml_file", { path: installPath, content: source });

    // Write a companion sidecar JSON with the extracted manifest.
    if (lintResult.extractedManifest !== null) {
      const sidecarPath = installPath.replace(/\.tsx$/u, ".manifest.json");
      await invoke("write_yaml_file", {
        path: sidecarPath,
        content: JSON.stringify(lintResult.extractedManifest, null, 2),
      });
    }

    return { ok: true, installedPath: installPath, violations: [] };
  } else {
    // Step 3 — quarantine
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

/**
 * Returns the directory (`active/` or `archived/`) that contains an existing
 * `.tsx` file for the given slug sent by the same sender.
 *
 * Both directories are checked in order: `active/` first, then `archived/`.
 * Returns `null` if no same-sender match is found in either directory
 * (new block → caller installs to `active/`).
 *
 * The sender match is verified by reading the existing file's manifest header
 * to prevent a different sender's same-slug file from being silently replaced.
 */
async function findExistingInstallDir(
  slug: string,
  incomingSender: string,
  activeDir: string,
  archivedDir: string,
): Promise<string | null> {
  for (const dir of [activeDir, archivedDir]) {
    const candidate = dir.endsWith("/") ? `${dir}${slug}.tsx` : `${dir}/${slug}.tsx`;
    let exists: boolean;
    try {
      exists = await invoke<boolean>("file_exists", { path: candidate });
    } catch {
      exists = false;
    }
    if (!exists) continue;

    // Verify same sender by reading the existing file's manifest header.
    try {
      const existingSource = await invoke<string>("read_yaml_file", { path: candidate });
      const parsed = parseManifestHeader(existingSource);
      if (parsed.ok && parsed.header.sender === incomingSender) {
        return dir;
      }
    } catch {
      // Unreadable existing file — skip, don't replace.
    }
  }
  return null;
}

// ─── Soft-archive lifecycle commands (T-167, ADR-0010) ────────────────────────

/**
 * Moves an Authored block `.tsx` file (and its `.manifest.json` sidecar) from
 * its current location into `dstDir`, creating `dstDir` if necessary.
 *
 * Typically called with `srcPath` pointing to `active/<slug>.tsx` and `dstDir`
 * pointing to `generated-blocks/archived/` to hide the block from the palette
 * while keeping it renderable in existing documents.
 *
 * @returns The absolute path of the file at its new location.
 */
export async function archiveAuthoredBlock(
  srcPath: string,
  dstDir: string,
): Promise<string> {
  return invoke<string>("archive_authored_block", { srcPath, dstDir });
}

/**
 * Moves an Authored block `.tsx` file (and its `.manifest.json` sidecar) from
 * `archived/` back into `dstDir` (typically `active/`), creating `dstDir` if
 * necessary.
 *
 * Semantically the reverse of {@link archiveAuthoredBlock}.
 *
 * @returns The absolute path of the file at its new (restored) location.
 */
export async function restoreAuthoredBlock(
  srcPath: string,
  dstDir: string,
): Promise<string> {
  return invoke<string>("restore_authored_block", { srcPath, dstDir });
}

/**
 * Permanently deletes an Authored block `.tsx` file and its `.manifest.json`
 * sidecar from the file system.
 *
 * **Destructive** — there is no undo.  The UI should confirm with the user
 * before calling this function.  Documents that reference the deleted block
 * will render `<RemovedBlockPlaceholder>` after deletion.
 */
export async function permanentlyDeleteAuthoredBlock(path: string): Promise<void> {
  await invoke("permanently_delete_authored_block", { path });
}

// ─── Share flow (T-174, ADR-0005) ────────────────────────────────────────────

/**
 * Result of a share-file operation.
 * `method` indicates how sharing was performed so the caller can surface
 * an appropriate confirmation to the user.
 */
export interface ShareBlockResult {
  /** "share-sheet" when the OS share sheet handled the file attachment.
   *  "clipboard" when the share-sheet was unavailable and the file path
   *  was copied to the clipboard as a fallback. */
  method: "share-sheet" | "clipboard";
}

/**
 * Shares a stamped Authored block file via the OS share sheet (e.g. Mail on
 * macOS). Falls back to copying the file path to the clipboard if the
 * share-sheet capability is not available on the current OS.
 *
 * The Rust sidecar (`src-tauri/src/commands/share_block.rs`) handles the
 * platform-specific API:
 *   - macOS: `NSSharingServicePicker` with the file URL.
 *   - Windows / Linux: clipboard fallback (share-sheet not available in v1).
 *
 * @param filePath  Absolute path to the `.tsx` file to share.
 */
export async function shareBlockFile(filePath: string): Promise<ShareBlockResult> {
  return invoke<ShareBlockResult>("share_block_file", { filePath });
}

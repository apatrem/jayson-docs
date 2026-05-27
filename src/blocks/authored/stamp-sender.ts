/**
 * Sender-stamping for the share flow (T-174, ADR-0005).
 *
 * Before sharing, a locally-generated Authored block has a placeholder sender
 * field (e.g. `local` or the generation system's value).  The share flow calls
 * `stampSender()` to replace that with the consultant's real email address and
 * update the timestamp to the share time.
 *
 * This is a pure TypeScript transformation — no Tauri IPC or file I/O here.
 * Callers are responsible for writing the stamped source back to disk and then
 * handing the file path to the OS share-sheet IPC (`shareBlockFile`).
 */

import {
  parseManifestHeader,
  serializeManifestHeader,
  type ManifestHeader,
} from "./manifest-header";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StampSenderOptions {
  /**
   * Override the share timestamp.  Defaults to `new Date().toISOString()`.
   * Inject in tests to get deterministic output.
   */
  now?: string;
}

export interface StampSenderResult {
  /** True when stamping succeeded. */
  ok: true;
  /** The full source text with the sender and timestamp updated in the header. */
  stampedSource: string;
  /** The updated header record (for logging / display). */
  header: ManifestHeader;
}

export interface StampSenderError {
  ok: false;
  /** Human-readable reason why stamping failed. */
  reason: string;
}

export type StampResult = StampSenderResult | StampSenderError;

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Stamps the sender email and share timestamp into an Authored block's manifest
 * header.
 *
 * @param source       Full text of the generated `.tsx` file (pre-share version).
 * @param senderEmail  The consultant's email address to embed as the block sender.
 * @param options      Optional overrides (e.g. timestamp injection for tests).
 * @returns A discriminated union: `{ ok: true, stampedSource, header }` on
 *          success, or `{ ok: false, reason }` if the header can't be parsed.
 */
export function stampSender(
  source: string,
  senderEmail: string,
  options: StampSenderOptions = {},
): StampResult {
  if (!senderEmail || !senderEmail.includes("@")) {
    return {
      ok: false,
      reason: `Invalid sender email: "${senderEmail}" — must be a valid email address.`,
    };
  }

  const parseResult = parseManifestHeader(source);
  if (!parseResult.ok) {
    return {
      ok: false,
      reason: `Cannot stamp sender — header parse failed: ${parseResult.error.message}`,
    };
  }

  const now = options.now ?? new Date().toISOString();
  const updatedHeader: ManifestHeader = {
    ...parseResult.header,
    sender: senderEmail,
    timestamp: now,
  };

  const newHeaderText = serializeManifestHeader(updatedHeader);

  // Replace the old block comment header.  The regex matches the opening `/**`
  // through the closing `*/` at the start of the file (same pattern as the
  // parser uses, with optional leading whitespace).
  const oldHeaderMatch = /^\s*\/\*\*[\s\S]*?\*\//u.exec(source);
  if (!oldHeaderMatch) {
    // The parser succeeded, so this branch should be unreachable in practice.
    return {
      ok: false,
      reason: "Cannot replace header — block comment not found in source.",
    };
  }

  const stampedSource = source.slice(0, oldHeaderMatch.index) +
    newHeaderText +
    source.slice(oldHeaderMatch.index + oldHeaderMatch[0].length);

  return { ok: true, stampedSource, header: updatedHeader };
}

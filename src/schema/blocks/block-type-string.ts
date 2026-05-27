/**
 * Block-type string schema and constants (T-162, ADR-0009).
 *
 * The `type` discriminant on every block must be one of two forms:
 *
 *   1. Standard/Brand identifier — kebab-case: `[a-z][a-z0-9-]*`
 *      Examples: "callout", "sector-risk-summary", "kpi-cards"
 *
 *   2. Authored type — `{sender-email}:{slug}`:
 *      Examples: "alice@consulting.example:sector-risk-summary"
 *
 * This module is a pure Zod schema — no React, TipTap, or runtime imports.
 */

import { z } from "zod";

// ─── Regexes ──────────────────────────────────────────────────────────────────

/**
 * Matches a valid Standard/Brand block-type identifier.
 * Rules: all lowercase, starts with a letter, may contain digits and hyphens,
 * no leading or trailing hyphens (a single letter is valid).
 * Form: `[a-z]([a-z0-9-]*[a-z0-9])?` — anchored start/end.
 */
export const BLOCK_IDENTIFIER_RE = /^[a-z]([a-z0-9-]*[a-z0-9])?$/u;

/**
 * Matches a valid Authored block slug (same shape as a Standard identifier).
 * The slug is the {slug} part of the `{sender}:{slug}` type string.
 */
export const AUTHORED_SLUG_RE = /^[a-z]([a-z0-9-]*[a-z0-9])?$/u;

/**
 * Matches a syntactically valid email address (syntax only, not deliverability).
 * Form: local-part @ domain . tld — no whitespace, no colons.
 */
export const AUTHORED_SENDER_RE = /^[^@:\s]+@[^@:\s]+\.[^@:\s.]+$/u;

/**
 * Matches a complete Authored block type string: `{email}:{kebab-slug}`.
 * The email part is validated syntactically (same rules as AUTHORED_SENDER_RE).
 * The slug part follows the same no-trailing-hyphen rule as AUTHORED_SLUG_RE.
 */
export const AUTHORED_TYPE_RE =
  /^[^@:\s]+@[^@:\s]+\.[^@:\s.]+:[a-z]([a-z0-9-]*[a-z0-9])?$/u;

// ─── Schema ───────────────────────────────────────────────────────────────────

/**
 * Validates a block `type` string.
 * Accepts either a Standard/Brand identifier or an Authored `{sender}:{slug}` string.
 * Rejects arbitrary strings, including those with whitespace or non-ASCII characters.
 */
export const BlockTypeStringSchema = z.string().refine(
  (s) => BLOCK_IDENTIFIER_RE.test(s) || AUTHORED_TYPE_RE.test(s),
  {
    message:
      "Block type must be a kebab-case identifier (e.g. 'callout') or an " +
      "Authored block type string ('{sender-email}:{slug}')",
  },
);

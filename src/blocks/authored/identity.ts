/**
 * Authored-block identity scheme utilities (T-162, ADR-0009).
 *
 * An Authored block's full type identifier is `{sender-email}:{slug}`.
 * This module provides typed parsing, construction, and validation of that
 * scheme, re-exporting the regex constants from the schema layer.
 *
 * Used by:
 *   - The receive-time lint (T-163) to validate incoming block files.
 *   - The runtime registry when registering an Authored block.
 *   - Tests that verify identity invariants.
 */

import {
  AUTHORED_SENDER_RE,
  AUTHORED_SLUG_RE,
  AUTHORED_TYPE_RE,
} from "../../schema/blocks/block-type-string";

// Re-export so callers can import from one place.
export { AUTHORED_SENDER_RE, AUTHORED_SLUG_RE, AUTHORED_TYPE_RE };

// ─── Parsed identity ──────────────────────────────────────────────────────────

/** The two components of an Authored block type string. */
export interface AuthoredBlockIdentity {
  /** Sender's email address (syntactically validated). */
  readonly sender: string;
  /** Block slug (kebab-case, unique within the sender's scope). */
  readonly slug: string;
}

// ─── Construction ─────────────────────────────────────────────────────────────

/**
 * Builds the full Authored block type string from sender + slug.
 * Does NOT validate the inputs; call validateAuthoredIdentity() first if needed.
 */
export function buildAuthoredBlockType(sender: string, slug: string): string {
  return `${sender}:${slug}`;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Returns true if `typeStr` is a valid Authored block type string.
 * False for Standard/Brand identifiers and for malformed strings.
 */
export function isAuthoredBlockType(typeStr: string): boolean {
  return AUTHORED_TYPE_RE.test(typeStr);
}

/**
 * Parses an Authored block type string into its { sender, slug } components.
 *
 * @returns The parsed identity, or `null` if the string is not a valid
 *          Authored type (e.g. it is a Standard/Brand identifier).
 */
export function parseAuthoredBlockType(
  typeStr: string,
): AuthoredBlockIdentity | null {
  if (!AUTHORED_TYPE_RE.test(typeStr)) return null;

  // The colon separating sender from slug is the LAST colon (safe because
  // RFC 5321 allows colons in the local-part of an email address, but we
  // validate the full string against AUTHORED_TYPE_RE first).
  // In practice, the local-part of a typical email never contains a colon,
  // so the first colon is the separator.  We find the separator as the colon
  // after the domain part (guaranteed to exist by the regex).
  const colonIdx = typeStr.lastIndexOf(":");
  const sender = typeStr.slice(0, colonIdx);
  const slug = typeStr.slice(colonIdx + 1);

  return { sender, slug };
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** The result of validateAuthoredIdentity. */
export type IdentityValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Validates the sender email and slug individually.
 *
 * Use this when you have the two components separately (e.g., when reading
 * them from a manifest header and manifest attrs before the full type string
 * is assembled).  For a pre-assembled type string use `isAuthoredBlockType`.
 *
 * @param sender  The sender email from the manifest header.
 * @param slug    The slug from inside `defineAuthoredBlock({ slug: "..." })`.
 */
export function validateAuthoredIdentity(
  sender: string,
  slug: string,
): IdentityValidationResult {
  const errors: string[] = [];

  if (!AUTHORED_SENDER_RE.test(sender)) {
    errors.push(
      `sender '${sender}' is not a syntactically valid email address ` +
        `(must match /^[^@:\\s]+@[^@:\\s]+\\.[^@:\\s.]+$/)`,
    );
  }

  if (!AUTHORED_SLUG_RE.test(slug)) {
    errors.push(
      `slug '${slug}' is not kebab-case ` +
        `(must match /^[a-z][a-z0-9-]*$/ — lowercase letters, digits, hyphens only)`,
    );
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}

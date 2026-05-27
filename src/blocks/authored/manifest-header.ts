/**
 * Manifest header parser + serializer for Authored block files (T-161, ADR-0005).
 *
 * Every Authored `.tsx` file begins with a structured block comment carrying
 * identity, traceability, and regeneration metadata.  This module parses that
 * comment into a typed record and can serialize it back to the exact same bytes
 * (round-trip guarantee required by ADR-0005 consequences).
 *
 * ## Header format (format version 1)
 *
 * ```
 * /**
 *  * authored-block-header: 1
 *  * scaffold-version: 1.0.0
 *  * generator: claude-sonnet-4-6
 *  * generator-version: 1.0.0
 *  * sender: alice@consulting.example
 *  * timestamp: 2026-05-27T10:00:00Z
 *  * slug: sector-risk-summary
 *  * original-prompt: Create a sector risk summary block with risk-level indicators.
 *  *\/
 * ```
 *
 * Rules:
 *   - The header MUST be the first comment in the file (`/**` at column 0).
 *   - Each line inside is `space asterisk space key: value` (single line per field).
 *   - Required fields: scaffold-version, sender, timestamp, slug.
 *   - Optional fields: generator, generator-version, original-prompt.
 *   - Field order in the serialized form is fixed (see `serializeManifestHeader`).
 *   - Values must not contain newlines; the serializer enforces this by collapsing
 *     `\n` to a single space.
 *
 * The format version tag (`authored-block-header: N`) acts as a forwards-compat
 * gate — parsers reject unknown versions without crashing on valid-future files.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** The structured record extracted from an Authored block's header comment. */
export interface ManifestHeader {
  /** Format version — always 1 in this implementation. */
  readonly formatVersion: 1;
  /** Scaffold (app) version the block was generated against (semver string). */
  readonly scaffoldVersion: string;
  /** Generator model name, e.g. "claude-sonnet-4-6". Optional. */
  readonly generator?: string;
  /** Generator model version string. Optional. */
  readonly generatorVersion?: string;
  /** Sender's email address (sole identity claim in v1). */
  readonly sender: string;
  /** ISO 8601 generation timestamp, e.g. "2026-05-27T10:00:00Z". */
  readonly timestamp: string;
  /**
   * Block slug — must match the `slug` field inside `defineAuthoredBlock({})`.
   * Validated against the manifest at lint time (rule A011).
   */
  readonly slug: string;
  /**
   * The original prompt used to generate the block.
   * Stored so the recipient can regenerate against a newer scaffold (ADR-0005).
   * Optional; single-line (no embedded newlines in the stored value).
   */
  readonly originalPrompt?: string;
}

/** A typed error returned when header parsing fails. */
export interface ManifestHeaderParseError {
  readonly kind: "parse-error";
  /** Human-readable explanation of why parsing failed. */
  readonly message: string;
  /** 1-based line number inside the block comment where the problem was found. */
  readonly line?: number;
}

/** Result of parseManifestHeader — discriminated union on `ok`. */
export type ParseResult =
  | { readonly ok: true; readonly header: ManifestHeader }
  | { readonly ok: false; readonly error: ManifestHeaderParseError };

// ─── Internal constants ───────────────────────────────────────────────────────

const FORMAT_TAG = "authored-block-header";
const SUPPORTED_FORMAT_VERSION = 1;

/**
 * Required header fields in the order they must appear in the serialized form.
 * Order is enforced by `serializeManifestHeader` to make round-trips byte-stable.
 */
const REQUIRED_FIELDS = ["scaffold-version", "sender", "timestamp", "slug"] as const;

// Optional fields (generator, generator-version, original-prompt) are included
// in serialization when present; unknown fields encountered during parsing are
// silently ignored (forward compatibility).

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses the first block comment of an Authored block file into a ManifestHeader.
 *
 * @param source  The full source text of the `.tsx` file.
 * @returns `{ ok: true, header }` on success, `{ ok: false, error }` on failure.
 */
export function parseManifestHeader(source: string): ParseResult {
  // The header comment must be the very first token in the file.
  // We accept a leading BOM (U+FEFF) or whitespace before `/**`.
  const blockCommentMatch = /^\s*\/\*\*([\s\S]*?)\*\//u.exec(source);
  if (!blockCommentMatch) {
    return err("No block comment found at file start");
  }

  // blockCommentMatch[1] is the first capture group — always present when the
  // regex matches because the group is not inside `|` or `?` quantifier.
  const commentBody = blockCommentMatch[1] ?? "";
  const rawLines = commentBody.split("\n");

  // Strip the per-line ` * ` prefix that block-comment formatters add.
  // The regex matches: optional leading whitespace, one `*`, one optional space.
  const lines: string[] = rawLines.map((raw) =>
    raw.replace(/^[ \t]*\*[ ]?/u, ""),
  );

  // Parse key–value pairs.  Each line is expected to be `key: value`.
  // Lines that don't match (blank lines, continuation noise) are skipped.
  const fields = new Map<string, string>();

  for (const line of lines) {
    if (line.trim() === "") continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue; // Not a key-value line; skip.

    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();

    if (key !== "") {
      fields.set(key, value);
    }
  }

  // Validate format tag and version.
  const formatVersionStr = fields.get(FORMAT_TAG);
  if (formatVersionStr === undefined) {
    return err(
      `Missing '${FORMAT_TAG}: N' line — not a valid Authored-block header`,
    );
  }
  const formatVersion = parseInt(formatVersionStr, 10);
  if (isNaN(formatVersion) || formatVersion !== SUPPORTED_FORMAT_VERSION) {
    return err(
      `Unsupported format version: ${formatVersionStr} (expected ${SUPPORTED_FORMAT_VERSION})`,
    );
  }

  // Validate required fields.
  for (const field of REQUIRED_FIELDS) {
    const value = fields.get(field);
    if (value === undefined || value === "") {
      return err(`Missing required header field: '${field}'`);
    }
  }

  // Assemble the typed record.
  // The non-null assertions on optional fields are safe: the ternary guards ensure
  // the map has a truthy (non-empty) value before we access it.
  const header: ManifestHeader = {
    formatVersion: 1,
    scaffoldVersion: fields.get("scaffold-version")!,
    ...(fields.get("generator") ? { generator: fields.get("generator")! } : {}),
    ...(fields.get("generator-version")
      ? { generatorVersion: fields.get("generator-version")! }
      : {}),
    sender: fields.get("sender")!,
    timestamp: fields.get("timestamp")!,
    slug: fields.get("slug")!,
    ...(fields.get("original-prompt")
      ? { originalPrompt: fields.get("original-prompt")! }
      : {}),
  };

  return { ok: true, header };
}

// ─── Serializer ───────────────────────────────────────────────────────────────

/**
 * Serializes a ManifestHeader back to the canonical block-comment string.
 *
 * Field order is fixed (FORMAT_TAG → scaffold-version → generator →
 * generator-version → sender → timestamp → slug → original-prompt) so that
 * parse(serialize(header)) returns a header equal to the input (round-trip).
 *
 * @param header  The header to serialize.
 * @returns A `/** ... *\/` block comment string without a trailing newline.
 */
export function serializeManifestHeader(header: ManifestHeader): string {
  // Collapse any embedded newlines in string values (the format is single-line).
  const clean = (s: string): string => s.replace(/\n/gu, " ").trim();

  const lines: string[] = [];

  const field = (key: string, value: string): void => {
    lines.push(` * ${key}: ${clean(value)}`);
  };

  field(FORMAT_TAG, String(header.formatVersion));
  field("scaffold-version", header.scaffoldVersion);
  if (header.generator !== undefined) field("generator", header.generator);
  if (header.generatorVersion !== undefined) field("generator-version", header.generatorVersion);
  field("sender", header.sender);
  field("timestamp", header.timestamp);
  field("slug", header.slug);
  if (header.originalPrompt !== undefined) field("original-prompt", header.originalPrompt);

  return `/**\n${lines.join("\n")}\n */`;
}

// ─── Convenience ──────────────────────────────────────────────────────────────

/**
 * Returns the header string that should be prepended to a generated Authored
 * block file.  The result ends with a newline so the next line (an import)
 * can follow immediately.
 */
export function buildFileHeader(header: ManifestHeader): string {
  return serializeManifestHeader(header) + "\n";
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function err(message: string, line?: number): ParseResult {
  return { ok: false, error: { kind: "parse-error", message, ...(line !== undefined ? { line } : {}) } };
}

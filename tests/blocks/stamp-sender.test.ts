/**
 * Tests for T-174: sender-stamping share flow.
 *
 * Covers:
 *   - stampSender replaces the sender field with the provided email.
 *   - stampSender updates the timestamp to the share time.
 *   - stampSender preserves all other header fields (slug, scaffoldVersion, etc.).
 *   - stampSender preserves the rest of the source (import + defineAuthoredBlock).
 *   - stampSender round-trips: parseManifestHeader(stampedSource) yields the new header.
 *   - stampSender fails cleanly when the header is malformed.
 *   - stampSender fails cleanly when the email is invalid.
 */

import { describe, expect, it } from "vitest";
import { stampSender } from "../../src/blocks/authored/stamp-sender";
import { parseManifestHeader } from "../../src/blocks/authored/manifest-header";

// ─── Fixture ──────────────────────────────────────────────────────────────────

/** A locally-generated block with a placeholder sender (pre-share). */
function makeSource(senderPlaceholder = "local"): string {
  return `/**
 * authored-block-header: 1
 * scaffold-version: 1.0.0
 * sender: ${senderPlaceholder}
 * timestamp: 2026-05-27T08:00:00Z
 * slug: competitive-matrix
 */
import { defineAuthoredBlock } from "./defineAuthoredBlock";
export default defineAuthoredBlock({
  slug: "competitive-matrix",
  title: "Competitive Matrix",
  paletteLabel: "Competitive Matrix",
  content: "none",
  attrs: [],
  template: { kind: "text", value: "Placeholder" },
});
`;
}

const SHARE_TIME = "2026-05-27T10:30:00Z";
const SENDER_EMAIL = "alice@consulting.example";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("stampSender (T-174)", () => {
  it("replaces the sender field with the provided email", () => {
    const result = stampSender(makeSource(), SENDER_EMAIL, { now: SHARE_TIME });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseManifestHeader(result.stampedSource);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.header.sender).toBe(SENDER_EMAIL);
  });

  it("updates the timestamp to the share time", () => {
    const result = stampSender(makeSource(), SENDER_EMAIL, { now: SHARE_TIME });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseManifestHeader(result.stampedSource);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.header.timestamp).toBe(SHARE_TIME);
  });

  it("preserves other header fields (slug, scaffoldVersion)", () => {
    const result = stampSender(makeSource(), SENDER_EMAIL, { now: SHARE_TIME });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const parsed = parseManifestHeader(result.stampedSource);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.header.slug).toBe("competitive-matrix");
    expect(parsed.header.scaffoldVersion).toBe("1.0.0");
    expect(parsed.header.formatVersion).toBe(1);
  });

  it("preserves the import and defineAuthoredBlock call after the header", () => {
    const result = stampSender(makeSource(), SENDER_EMAIL, { now: SHARE_TIME });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.stampedSource).toContain('import { defineAuthoredBlock }');
    expect(result.stampedSource).toContain('export default defineAuthoredBlock({');
    expect(result.stampedSource).toContain('"competitive-matrix"');
  });

  it("returns the updated header in the result object", () => {
    const result = stampSender(makeSource(), SENDER_EMAIL, { now: SHARE_TIME });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.header.sender).toBe(SENDER_EMAIL);
    expect(result.header.timestamp).toBe(SHARE_TIME);
    expect(result.header.slug).toBe("competitive-matrix");
  });

  it("round-trips: parseManifestHeader(stampedSource) yields the new header", () => {
    const result = stampSender(makeSource(), SENDER_EMAIL, { now: SHARE_TIME });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const re = parseManifestHeader(result.stampedSource);
    expect(re.ok).toBe(true);
    if (!re.ok) return;
    expect(re.header).toMatchObject({
      sender: SENDER_EMAIL,
      timestamp: SHARE_TIME,
      slug: "competitive-matrix",
      scaffoldVersion: "1.0.0",
    });
  });

  it("works when the original sender is the LLM placeholder value", () => {
    const source = makeSource("(leave blank — the share flow stamps this)");
    const result = stampSender(source, SENDER_EMAIL, { now: SHARE_TIME });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = parseManifestHeader(result.stampedSource);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.header.sender).toBe(SENDER_EMAIL);
  });

  it("stamps a different email on a second call (non-destructive to original)", () => {
    const source = makeSource();
    const r1 = stampSender(source, "alice@example.com", { now: "2026-05-27T10:00:00Z" });
    const r2 = stampSender(source, "bob@example.com", { now: "2026-05-27T11:00:00Z" });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;

    const p1 = parseManifestHeader(r1.stampedSource);
    const p2 = parseManifestHeader(r2.stampedSource);
    expect(p1.ok && p1.header.sender).toBe("alice@example.com");
    expect(p2.ok && (p2 as typeof p2 & { ok: true }).header.sender).toBe("bob@example.com");
  });

  it("fails when the email is missing an @ symbol", () => {
    const result = stampSender(makeSource(), "not-an-email");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("email");
  });

  it("fails when the email is empty", () => {
    const result = stampSender(makeSource(), "");
    expect(result.ok).toBe(false);
  });

  it("fails with a clear reason when the source has a malformed header", () => {
    const malformedSource = `/* not a valid authored-block header */\nimport {}`;
    const result = stampSender(malformedSource, SENDER_EMAIL);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason.toLowerCase()).toContain("header");
  });
});

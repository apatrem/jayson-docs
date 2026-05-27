/**
 * Tests for manifest-header.ts (T-161).
 *
 * Covers:
 *   1. parseManifestHeader — valid headers (minimal, full, with optional fields).
 *   2. parseManifestHeader — invalid headers (missing required fields, bad version).
 *   3. serializeManifestHeader — field order, clean output.
 *   4. Round-trip: parse → serialize → parse gives identical bytes and data.
 *   5. buildFileHeader — trailing newline contract.
 */

import { describe, it, expect } from "vitest";
import {
  parseManifestHeader,
  serializeManifestHeader,
  buildFileHeader,
  type ManifestHeader,
} from "../../src/blocks/authored/manifest-header";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wraps lines in a `/** ... *\/` comment as a full file source. */
function headerSource(lines: string[]): string {
  const body = lines.map((l) => ` * ${l}`).join("\n");
  return `/**\n${body}\n */\n`;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MINIMAL_HEADER: ManifestHeader = {
  formatVersion: 1,
  scaffoldVersion: "1.0.0",
  sender: "alice@consulting.example",
  timestamp: "2026-05-27T10:00:00Z",
  slug: "sector-risk-summary",
};

const FULL_HEADER: ManifestHeader = {
  formatVersion: 1,
  scaffoldVersion: "1.0.0",
  generator: "claude-sonnet-4-6",
  generatorVersion: "1.0.0",
  sender: "alice@consulting.example",
  timestamp: "2026-05-27T10:00:00Z",
  slug: "sector-risk-summary",
  originalPrompt: "Create a sector risk summary block with risk-level indicators.",
};

// ─── 1. Parse — valid ─────────────────────────────────────────────────────────

describe("parseManifestHeader — valid headers", () => {
  it("parses a minimal header (required fields only)", () => {
    const source = headerSource([
      "authored-block-header: 1",
      "scaffold-version: 1.0.0",
      "sender: alice@consulting.example",
      "timestamp: 2026-05-27T10:00:00Z",
      "slug: sector-risk-summary",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.header.formatVersion).toBe(1);
      expect(result.header.scaffoldVersion).toBe("1.0.0");
      expect(result.header.sender).toBe("alice@consulting.example");
      expect(result.header.timestamp).toBe("2026-05-27T10:00:00Z");
      expect(result.header.slug).toBe("sector-risk-summary");
      expect(result.header.generator).toBeUndefined();
      expect(result.header.generatorVersion).toBeUndefined();
      expect(result.header.originalPrompt).toBeUndefined();
    }
  });

  it("parses a full header with all optional fields", () => {
    const source = headerSource([
      "authored-block-header: 1",
      "scaffold-version: 1.0.0",
      "generator: claude-sonnet-4-6",
      "generator-version: 1.0.0",
      "sender: alice@consulting.example",
      "timestamp: 2026-05-27T10:00:00Z",
      "slug: sector-risk-summary",
      "original-prompt: Create a sector risk summary block with risk-level indicators.",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.header.generator).toBe("claude-sonnet-4-6");
      expect(result.header.generatorVersion).toBe("1.0.0");
      expect(result.header.originalPrompt).toBe(
        "Create a sector risk summary block with risk-level indicators.",
      );
    }
  });

  it("ignores blank lines inside the header comment", () => {
    const source = `/**\n * authored-block-header: 1\n *\n * scaffold-version: 1.0.0\n * sender: a@b.com\n * timestamp: 2026-01-01T00:00:00Z\n * slug: test-block\n */\n`;
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(true);
  });

  it("ignores unknown fields (forward compatibility)", () => {
    const source = headerSource([
      "authored-block-header: 1",
      "scaffold-version: 1.0.0",
      "sender: a@b.com",
      "timestamp: 2026-01-01T00:00:00Z",
      "slug: test-block",
      "future-field: some new metadata",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(true);
  });

  it("handles slug with hyphens and numbers", () => {
    const source = headerSource([
      "authored-block-header: 1",
      "scaffold-version: 2.3.1",
      "sender: bob@firm123.co.uk",
      "timestamp: 2026-12-31T23:59:59Z",
      "slug: kpi-cards-v2",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.header.slug).toBe("kpi-cards-v2");
      expect(result.header.scaffoldVersion).toBe("2.3.1");
    }
  });

  it("extracts header from a file that has more content after the comment", () => {
    const source =
      headerSource([
        "authored-block-header: 1",
        "scaffold-version: 1.0.0",
        "sender: a@b.com",
        "timestamp: 2026-01-01T00:00:00Z",
        "slug: test-block",
      ]) +
      "\nimport { defineAuthoredBlock } from '../../src/blocks/authored/defineAuthoredBlock';\n";
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(true);
  });
});

// ─── 2. Parse — invalid ───────────────────────────────────────────────────────

describe("parseManifestHeader — invalid headers", () => {
  it("fails when there is no block comment", () => {
    const result = parseManifestHeader(
      "import { defineAuthoredBlock } from './defineAuthoredBlock';\n",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("parse-error");
      expect(result.error.message).toContain("No block comment found");
    }
  });

  it("fails when the header tag is absent", () => {
    const source = headerSource([
      "scaffold-version: 1.0.0",
      "sender: a@b.com",
      "timestamp: 2026-01-01T00:00:00Z",
      "slug: test-block",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("authored-block-header");
    }
  });

  it("fails when the format version is unsupported", () => {
    const source = headerSource([
      "authored-block-header: 99",
      "scaffold-version: 1.0.0",
      "sender: a@b.com",
      "timestamp: 2026-01-01T00:00:00Z",
      "slug: test-block",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Unsupported format version");
    }
  });

  it("fails when scaffold-version is missing", () => {
    const source = headerSource([
      "authored-block-header: 1",
      "sender: a@b.com",
      "timestamp: 2026-01-01T00:00:00Z",
      "slug: test-block",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("scaffold-version");
    }
  });

  it("fails when sender is missing", () => {
    const source = headerSource([
      "authored-block-header: 1",
      "scaffold-version: 1.0.0",
      "timestamp: 2026-01-01T00:00:00Z",
      "slug: test-block",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("sender");
    }
  });

  it("fails when timestamp is missing", () => {
    const source = headerSource([
      "authored-block-header: 1",
      "scaffold-version: 1.0.0",
      "sender: a@b.com",
      "slug: test-block",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("timestamp");
    }
  });

  it("fails when slug is missing", () => {
    const source = headerSource([
      "authored-block-header: 1",
      "scaffold-version: 1.0.0",
      "sender: a@b.com",
      "timestamp: 2026-01-01T00:00:00Z",
    ]);
    const result = parseManifestHeader(source);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("slug");
    }
  });
});

// ─── 3. Serialize ─────────────────────────────────────────────────────────────

describe("serializeManifestHeader", () => {
  it("produces a block comment with the format tag on the first content line", () => {
    const output = serializeManifestHeader(MINIMAL_HEADER);
    expect(output.startsWith("/**\n")).toBe(true);
    expect(output.endsWith("\n */")).toBe(true);
    expect(output).toContain(" * authored-block-header: 1");
  });

  it("includes all required fields", () => {
    const output = serializeManifestHeader(MINIMAL_HEADER);
    expect(output).toContain("scaffold-version: 1.0.0");
    expect(output).toContain("sender: alice@consulting.example");
    expect(output).toContain("timestamp: 2026-05-27T10:00:00Z");
    expect(output).toContain("slug: sector-risk-summary");
  });

  it("omits optional fields when absent", () => {
    const output = serializeManifestHeader(MINIMAL_HEADER);
    expect(output).not.toContain("generator:");
    expect(output).not.toContain("original-prompt:");
  });

  it("includes optional fields when present", () => {
    const output = serializeManifestHeader(FULL_HEADER);
    expect(output).toContain("generator: claude-sonnet-4-6");
    expect(output).toContain("generator-version: 1.0.0");
    expect(output).toContain(
      "original-prompt: Create a sector risk summary block with risk-level indicators.",
    );
  });

  it("collapses embedded newlines in values to spaces", () => {
    const headerWithNewline: ManifestHeader = {
      ...MINIMAL_HEADER,
      originalPrompt: "line one\nline two",
    };
    const output = serializeManifestHeader(headerWithNewline);
    // Newline collapsed to space — no multi-line leaking
    expect(output).toContain("original-prompt: line one line two");
  });

  it("emits fields in a fixed order", () => {
    const output = serializeManifestHeader(FULL_HEADER);
    const headerIdx = output.indexOf("authored-block-header");
    const scaffoldIdx = output.indexOf("scaffold-version");
    const generatorIdx = output.indexOf("generator:");
    const generatorVersionIdx = output.indexOf("generator-version");
    const senderIdx = output.indexOf("sender:");
    const timestampIdx = output.indexOf("timestamp:");
    const slugIdx = output.indexOf("slug:");
    const promptIdx = output.indexOf("original-prompt:");

    expect(headerIdx).toBeLessThan(scaffoldIdx);
    expect(scaffoldIdx).toBeLessThan(generatorIdx);
    expect(generatorIdx).toBeLessThan(generatorVersionIdx);
    expect(generatorVersionIdx).toBeLessThan(senderIdx);
    expect(senderIdx).toBeLessThan(timestampIdx);
    expect(timestampIdx).toBeLessThan(slugIdx);
    expect(slugIdx).toBeLessThan(promptIdx);
  });
});

// ─── 4. Round-trip ────────────────────────────────────────────────────────────

describe("Round-trip: parse → serialize → parse", () => {
  it("round-trips a minimal header — identical bytes", () => {
    const serialized = serializeManifestHeader(MINIMAL_HEADER);
    const reparsed = parseManifestHeader(serialized);
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      // Re-serialize and check bytes are identical
      const reserialised = serializeManifestHeader(reparsed.header);
      expect(reserialised).toBe(serialized);
    }
  });

  it("round-trips a full header — identical bytes", () => {
    const serialized = serializeManifestHeader(FULL_HEADER);
    const reparsed = parseManifestHeader(serialized);
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      const reserialised = serializeManifestHeader(reparsed.header);
      expect(reserialised).toBe(serialized);
    }
  });

  it("round-trips a minimal header — identical data", () => {
    const serialized = serializeManifestHeader(MINIMAL_HEADER);
    const reparsed = parseManifestHeader(serialized);
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      expect(reparsed.header).toEqual(MINIMAL_HEADER);
    }
  });

  it("round-trips a full header — identical data", () => {
    const serialized = serializeManifestHeader(FULL_HEADER);
    const reparsed = parseManifestHeader(serialized);
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      expect(reparsed.header).toEqual(FULL_HEADER);
    }
  });

  it("parse then serialize produces the same bytes as a hand-written header", () => {
    // Build the expected canonical string from scratch
    const source = headerSource([
      "authored-block-header: 1",
      "scaffold-version: 1.0.0",
      "sender: alice@consulting.example",
      "timestamp: 2026-05-27T10:00:00Z",
      "slug: sector-risk-summary",
    ]);
    const parsed = parseManifestHeader(source);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const reserialized = serializeManifestHeader(parsed.header);
      // The canonical serialization must match serialize(MINIMAL_HEADER)
      expect(reserialized).toBe(serializeManifestHeader(MINIMAL_HEADER));
    }
  });
});

// ─── 5. buildFileHeader ───────────────────────────────────────────────────────

describe("buildFileHeader", () => {
  it("ends with a newline so the next line follows cleanly", () => {
    const output = buildFileHeader(MINIMAL_HEADER);
    expect(output.endsWith("\n")).toBe(true);
  });

  it("produces a parseable header", () => {
    const file = buildFileHeader(MINIMAL_HEADER) + "\n// file content here\n";
    const result = parseManifestHeader(file);
    expect(result.ok).toBe(true);
  });
});

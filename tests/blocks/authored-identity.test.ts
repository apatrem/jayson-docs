/**
 * Tests for T-162: identity scheme validator.
 *
 * Covers:
 *   1. BlockTypeStringSchema — validates both Standard/Brand and Authored formats.
 *   2. isAuthoredBlockType / parseAuthoredBlockType — parsing utilities.
 *   3. buildAuthoredBlockType — construction.
 *   4. validateAuthoredIdentity — per-component validation.
 *   5. Lint rule presence — A012 and A013 are declared in AUTHORED_BLOCK_LINT_RULES.
 */

import { describe, it, expect } from "vitest";
import {
  BlockTypeStringSchema,
  AUTHORED_TYPE_RE,
  AUTHORED_SLUG_RE,
  AUTHORED_SENDER_RE,
} from "../../src/schema/blocks/block-type-string";
import {
  isAuthoredBlockType,
  parseAuthoredBlockType,
  buildAuthoredBlockType,
  validateAuthoredIdentity,
} from "../../src/blocks/authored/identity";
import { AUTHORED_BLOCK_LINT_RULES } from "../../src/blocks/authored/lint-rules";

// ─── 1. BlockTypeStringSchema ─────────────────────────────────────────────────

describe("BlockTypeStringSchema — Standard/Brand types", () => {
  const valid = [
    "callout",
    "chart",
    "kpi-cards",
    "sector-risk-summary",
    "risk-matrix",
    "a",
    "a1",
    "abc-def-ghi",
  ];
  const invalid = [
    "",
    "Callout",           // uppercase
    "kpi_cards",         // underscore
    "-callout",          // leading hyphen
    "callout-",          // trailing hyphen
    "my block",          // space
    "callout:extra",     // colon without email — would need to be a valid authored type
  ];

  for (const s of valid) {
    it(`accepts '${s}'`, () => {
      expect(BlockTypeStringSchema.safeParse(s).success).toBe(true);
    });
  }

  for (const s of invalid) {
    it(`rejects '${s}'`, () => {
      expect(BlockTypeStringSchema.safeParse(s).success).toBe(false);
    });
  }
});

describe("BlockTypeStringSchema — Authored types ({sender}:{slug})", () => {
  const valid = [
    "alice@consulting.example:sector-risk-summary",
    "bob@firm.co.uk:kpi-v2",
    "carol@a.b.c:my-block",
    "user+tag@example.org:another-block",
  ];
  const invalid = [
    "alice@consulting.example:",       // empty slug
    "@consulting.example:block",       // no local-part
    "alice@:block",                    // no domain
    "alice@consulting:block",          // no TLD
    "alice consulting.example:block",  // space in email
    "alice@consulting.example:Block",  // uppercase slug
    "alice@consulting.example:my_block", // underscore in slug
  ];

  for (const s of valid) {
    it(`accepts '${s}'`, () => {
      expect(BlockTypeStringSchema.safeParse(s).success).toBe(true);
    });
  }

  for (const s of invalid) {
    it(`rejects '${s}'`, () => {
      expect(BlockTypeStringSchema.safeParse(s).success).toBe(false);
    });
  }
});

// ─── 2. Parsing utilities ─────────────────────────────────────────────────────

describe("isAuthoredBlockType", () => {
  it("returns true for a valid authored type string", () => {
    expect(isAuthoredBlockType("alice@consulting.example:sector-risk")).toBe(true);
  });

  it("returns false for a Standard/Brand identifier", () => {
    expect(isAuthoredBlockType("callout")).toBe(false);
    expect(isAuthoredBlockType("sector-risk-summary")).toBe(false);
  });

  it("returns false for malformed strings", () => {
    expect(isAuthoredBlockType("")).toBe(false);
    expect(isAuthoredBlockType("alice@consulting.example:")).toBe(false);
    expect(isAuthoredBlockType(":block")).toBe(false);
  });
});

describe("parseAuthoredBlockType", () => {
  it("returns null for a Standard identifier", () => {
    expect(parseAuthoredBlockType("callout")).toBeNull();
  });

  it("parses a valid authored type into { sender, slug }", () => {
    const result = parseAuthoredBlockType("alice@consulting.example:sector-risk");
    expect(result).not.toBeNull();
    if (result) {
      expect(result.sender).toBe("alice@consulting.example");
      expect(result.slug).toBe("sector-risk");
    }
  });

  it("handles a slug with hyphens", () => {
    const result = parseAuthoredBlockType("bob@firm.co.uk:kpi-cards-v2");
    expect(result?.sender).toBe("bob@firm.co.uk");
    expect(result?.slug).toBe("kpi-cards-v2");
  });

  it("returns null for a malformed string", () => {
    expect(parseAuthoredBlockType("not-a-type-at-all")).toBeNull();
    expect(parseAuthoredBlockType("alice@consulting.example:")).toBeNull();
  });
});

// ─── 3. Construction ──────────────────────────────────────────────────────────

describe("buildAuthoredBlockType", () => {
  it("joins sender and slug with a colon", () => {
    expect(buildAuthoredBlockType("alice@consulting.example", "sector-risk")).toBe(
      "alice@consulting.example:sector-risk",
    );
  });

  it("produces a string that round-trips through parseAuthoredBlockType", () => {
    const sender = "bob@firm.co.uk";
    const slug = "kpi-v2";
    const typeStr = buildAuthoredBlockType(sender, slug);
    const parsed = parseAuthoredBlockType(typeStr);
    expect(parsed?.sender).toBe(sender);
    expect(parsed?.slug).toBe(slug);
  });
});

// ─── 4. validateAuthoredIdentity ─────────────────────────────────────────────

describe("validateAuthoredIdentity", () => {
  it("returns ok: true for a valid sender + slug", () => {
    const result = validateAuthoredIdentity(
      "alice@consulting.example",
      "sector-risk-summary",
    );
    expect(result.ok).toBe(true);
  });

  it("rejects an invalid email sender", () => {
    const result = validateAuthoredIdentity("not-an-email", "sector-risk");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("sender"))).toBe(true);
    }
  });

  it("rejects an invalid slug (uppercase)", () => {
    const result = validateAuthoredIdentity(
      "alice@consulting.example",
      "SectorRisk",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("slug"))).toBe(true);
    }
  });

  it("rejects an invalid slug (underscore)", () => {
    const result = validateAuthoredIdentity(
      "alice@consulting.example",
      "sector_risk",
    );
    expect(result.ok).toBe(false);
  });

  it("reports both errors when both sender and slug are invalid", () => {
    const result = validateAuthoredIdentity("bad-email", "Bad_Slug");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(2);
    }
  });
});

// ─── 5. Lint rules presence ───────────────────────────────────────────────────

describe("AUTHORED_BLOCK_LINT_RULES — A012 + A013 are declared", () => {
  const ruleIds = AUTHORED_BLOCK_LINT_RULES.map((r) => r.id);

  it("includes A012-slug-kebab-case", () => {
    expect(ruleIds).toContain("A012-slug-kebab-case");
  });

  it("includes A013-sender-valid-email", () => {
    expect(ruleIds).toContain("A013-sender-valid-email");
  });

  it("A012 has severity reject", () => {
    const rule = AUTHORED_BLOCK_LINT_RULES.find(
      (r) => r.id === "A012-slug-kebab-case",
    );
    expect(rule?.severity).toBe("reject");
  });

  it("A013 has severity reject", () => {
    const rule = AUTHORED_BLOCK_LINT_RULES.find(
      (r) => r.id === "A013-sender-valid-email",
    );
    expect(rule?.severity).toBe("reject");
  });
});

// ─── 6. Regex sanity checks ───────────────────────────────────────────────────

describe("Regex constants", () => {
  it("AUTHORED_SLUG_RE accepts kebab-case slugs", () => {
    expect(AUTHORED_SLUG_RE.test("sector-risk-summary")).toBe(true);
    expect(AUTHORED_SLUG_RE.test("a")).toBe(true);
    expect(AUTHORED_SLUG_RE.test("kpi2")).toBe(true);
  });

  it("AUTHORED_SLUG_RE rejects uppercase and underscores", () => {
    expect(AUTHORED_SLUG_RE.test("SectorRisk")).toBe(false);
    expect(AUTHORED_SLUG_RE.test("sector_risk")).toBe(false);
    expect(AUTHORED_SLUG_RE.test("")).toBe(false);
  });

  it("AUTHORED_SENDER_RE accepts valid emails", () => {
    expect(AUTHORED_SENDER_RE.test("alice@consulting.example")).toBe(true);
    expect(AUTHORED_SENDER_RE.test("bob+tag@firm.co.uk")).toBe(true);
  });

  it("AUTHORED_SENDER_RE rejects non-emails", () => {
    expect(AUTHORED_SENDER_RE.test("not-an-email")).toBe(false);
    expect(AUTHORED_SENDER_RE.test("@example.com")).toBe(false);
    expect(AUTHORED_SENDER_RE.test("alice@")).toBe(false);
  });

  it("AUTHORED_TYPE_RE accepts full authored type strings", () => {
    expect(
      AUTHORED_TYPE_RE.test("alice@consulting.example:sector-risk-summary"),
    ).toBe(true);
  });

  it("AUTHORED_TYPE_RE rejects plain identifiers", () => {
    expect(AUTHORED_TYPE_RE.test("callout")).toBe(false);
    expect(AUTHORED_TYPE_RE.test("sector-risk-summary")).toBe(false);
  });
});

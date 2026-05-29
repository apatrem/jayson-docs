import { describe, expect, it } from "vitest";
import {
  computeHeadingNumbers,
  formatCounter,
  resolveNumberingScheme,
  type HeadingLike,
  type NumberingScheme,
} from "../../src/blocks/heading/numbering";

const DECIMAL: NumberingScheme = {
  levelFormats: ["decimal", "decimal", "decimal", "decimal"],
  separator: ".",
};

function h(level: number, numbered?: boolean): HeadingLike {
  return numbered === undefined ? { level } : { level, numbered };
}

describe("computeHeadingNumbers — outline / continuous (ADR-0018)", () => {
  it("numbers a simple hierarchy", () => {
    expect(computeHeadingNumbers([h(1), h(2), h(2), h(1)], DECIMAL)).toEqual([
      "1",
      "1.1",
      "1.2",
      "2",
    ]);
  });

  it("resets deeper counters when a higher level increments", () => {
    expect(
      computeHeadingNumbers([h(1), h(2), h(3), h(2), h(1)], DECIMAL),
    ).toEqual(["1", "1.1", "1.1.1", "1.2", "2"]);
  });

  it("runs continuously and ignores grouping (no per-section reset)", () => {
    // Two H1s far apart still count 1, 2 — the util only sees order.
    expect(computeHeadingNumbers([h(1), h(2), h(1), h(2)], DECIMAL)).toEqual([
      "1",
      "1.1",
      "2",
      "2.1",
    ]);
  });

  it("skips unnumbered headings entirely — no number, no increment", () => {
    expect(
      computeHeadingNumbers([h(1), h(2, false), h(2)], DECIMAL),
    ).toEqual(["1", null, "1.1"]);
    expect(
      computeHeadingNumbers([h(1), h(1, false), h(1)], DECIMAL),
    ).toEqual(["1", null, "2"]);
  });

  it("omits an absent/unnumbered ancestor level from the prefix", () => {
    // Orphan H2 before any H1, then an H1, then a child H2.
    expect(computeHeadingNumbers([h(2), h(1), h(2)], DECIMAL)).toEqual([
      "1",
      "1",
      "1.1",
    ]);
  });

  it("applies per-level formats (1.A.i) and a custom separator", () => {
    const scheme: NumberingScheme = {
      levelFormats: ["decimal", "upper-alpha", "lower-roman", "decimal"],
      separator: ".",
    };
    expect(
      computeHeadingNumbers([h(1), h(2), h(3), h(3), h(2)], scheme),
    ).toEqual(["1", "1.A", "1.A.i", "1.A.ii", "1.B"]);

    const dashed: NumberingScheme = { ...DECIMAL, separator: "-" };
    expect(computeHeadingNumbers([h(1), h(2)], dashed)).toEqual(["1", "1-1"]);
  });

  it("clamps out-of-range levels into 1..4 (and omits skipped middle levels)", () => {
    // h(0)→L1, h(9)→L4; L2/L3 were never used, so they're omitted from the L4
    // prefix → "1.1", not "1.1.1.1".
    expect(computeHeadingNumbers([h(0), h(9)], DECIMAL)).toEqual(["1", "1.1"]);
  });
});

describe("formatCounter", () => {
  it("formats decimal / alpha / roman", () => {
    expect(formatCounter(3, "decimal")).toBe("3");
    expect([1, 26, 27, 52, 53].map((n) => formatCounter(n, "lower-alpha"))).toEqual([
      "a",
      "z",
      "aa",
      "az",
      "ba",
    ]);
    expect(formatCounter(27, "upper-alpha")).toBe("AA");
    expect([1, 4, 9, 14, 40, 90].map((n) => formatCounter(n, "lower-roman"))).toEqual([
      "i",
      "iv",
      "ix",
      "xiv",
      "xl",
      "xc",
    ]);
    expect(formatCounter(4, "upper-roman")).toBe("IV");
  });
});

describe("resolveNumberingScheme — meta > brand > default", () => {
  it("falls back to the all-decimal default", () => {
    expect(resolveNumberingScheme(undefined, undefined)).toEqual(DECIMAL);
  });

  it("uses the brand house style when present", () => {
    const brand = { numbering: { levelFormats: ["upper-alpha", "decimal", "decimal", "decimal"] as const, separator: ")" } };
    expect(resolveNumberingScheme(brand, undefined)).toEqual({
      levelFormats: ["upper-alpha", "decimal", "decimal", "decimal"],
      separator: ")",
    });
  });

  it("lets a per-document override win field-by-field", () => {
    const brand = { numbering: { levelFormats: ["upper-alpha", "decimal", "decimal", "decimal"] as const, separator: ")" } };
    const meta = { layout: { numbering: { separator: "." } } };
    // separator overridden by meta; levelFormats inherited from brand.
    expect(resolveNumberingScheme(brand, meta)).toEqual({
      levelFormats: ["upper-alpha", "decimal", "decimal", "decimal"],
      separator: ".",
    });
  });
});

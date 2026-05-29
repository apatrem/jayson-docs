import { describe, expect, it } from "vitest";
import {
  DEFAULT_BLOCK_SPACING_MULTIPLE,
  resolveBlockGapPx,
  resolveBlockSpacingMultiple,
} from "../../src/renderer/block-spacing";

const brand = { spacing: { unit: 4, scale: [4, 8] } };

describe("block-spacing resolver (ADR-0018, item 6)", () => {
  it("defaults to the brand multiple when no override", () => {
    expect(resolveBlockSpacingMultiple(undefined)).toBe(DEFAULT_BLOCK_SPACING_MULTIPLE);
    expect(resolveBlockSpacingMultiple({ layout: {} })).toBe(DEFAULT_BLOCK_SPACING_MULTIPLE);
    expect(resolveBlockGapPx(brand, undefined)).toBe(4 * DEFAULT_BLOCK_SPACING_MULTIPLE);
  });

  it("uses a per-document override when present", () => {
    expect(resolveBlockSpacingMultiple({ layout: { blockSpacing: 5 } })).toBe(5);
    expect(resolveBlockGapPx(brand, { layout: { blockSpacing: 5 } })).toBe(20);
    // 0 is a valid (tight) override.
    expect(resolveBlockGapPx(brand, { layout: { blockSpacing: 0 } })).toBe(0);
  });

  it("ignores a negative override and falls back to the default", () => {
    expect(resolveBlockSpacingMultiple({ layout: { blockSpacing: -2 } })).toBe(
      DEFAULT_BLOCK_SPACING_MULTIPLE,
    );
  });
});

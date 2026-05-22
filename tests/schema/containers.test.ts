import { describe, it, expect } from "vitest";
import { BlockSchema } from "../../src/schema/blocks";
import { SectionSchema, SlideSchema } from "../../src/schema/containers";

const proseBlock = {
  id: "b1-prose-01",
  type: "prose",
  content: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Hello" }] }],
  },
};

describe("SectionSchema", () => {
  it("requires at least one block", () => {
    expect(
      SectionSchema.parse({
        id: "sec-01",
        blocks: [proseBlock],
      }),
    ).toBeDefined();
    expect(
      SectionSchema.safeParse({ id: "sec-01", blocks: [] }).success,
    ).toBe(false);
  });
});

describe("SlideSchema", () => {
  it("accepts closed layout enum values", () => {
    expect(
      SlideSchema.parse({
        id: "slide-01",
        layout: "kpis",
        blocks: [],
      }).layout,
    ).toBe("kpis");
  });

  it("rejects unknown layout values", () => {
    expect(
      SlideSchema.safeParse({
        id: "slide-01",
        layout: "freeform",
        blocks: [],
      }).success,
    ).toBe(false);
  });

  it("allows empty blocks for divider layouts", () => {
    expect(
      SlideSchema.parse({
        id: "slide-divider",
        layout: "section-divider",
        blocks: [],
      }).blocks,
    ).toEqual([]);
  });
});

describe("SectionSchema block union", () => {
  it("rejects unknown block types inside a section", () => {
    expect(
      SectionSchema.safeParse({
        id: "sec-01",
        blocks: [{ id: "b1", type: "unknown-block" }],
      }).success,
    ).toBe(false);
    expect(BlockSchema.safeParse({ id: "b1", type: "unknown-block" }).success).toBe(
      false,
    );
  });
});

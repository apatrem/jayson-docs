import { describe, it, expect } from "vitest";
import { BlockSchema } from "../../src/schema/blocks";

const mixedFixture = [
  {
    id: "b1-prose-01",
    type: "prose",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Intro" }],
        },
      ],
    },
  },
  {
    id: "b1-heading-01",
    type: "heading",
    level: 2,
    text: "Section",
    numbered: true,
  },
  {
    id: "b2-bullets-01",
    type: "bullet-list",
    items: [
      {
        text: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Point A" }],
            },
          ],
        },
      },
    ],
  },
  {
    id: "b3-numbered-01",
    type: "numbered-list",
    items: [
      {
        text: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Step 1" }],
            },
          ],
        },
      },
    ],
  },
  {
    id: "b4-callout-01",
    type: "callout",
    variant: "info",
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Note" }],
        },
      ],
    },
  },
];

describe("BlockSchema discriminated union", () => {
  it("accepts a fixture mixing all currently-implemented block types", () => {
    for (const block of mixedFixture) {
      expect(BlockSchema.safeParse(block).success).toBe(true);
    }
    expect(BlockSchema.array().parse(mixedFixture)).toHaveLength(5);
  });

  it("rejects an unknown block type via discriminator", () => {
    const result = BlockSchema.safeParse({
      id: "b9-unknown-01",
      type: "celebration",
      body: "nope",
    });
    expect(result.success).toBe(false);
  });
});

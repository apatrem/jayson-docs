import { describe, it, expect } from "vitest";
import { BlockBaseSchema } from "../../src/schema/blocks";

describe("BlockBaseSchema", () => {
  it("requires id and type", () => {
    expect(
      BlockBaseSchema.parse({ id: "b1", type: "prose" }),
    ).toEqual({ id: "b1", type: "prose" });
  });

  it("accepts optional note", () => {
    expect(
      BlockBaseSchema.parse({ id: "b1", type: "prose", note: "draft" }),
    ).toEqual({ id: "b1", type: "prose", note: "draft" });
  });

  it("rejects unknown keys", () => {
    expect(
      BlockBaseSchema.safeParse({ id: "b1", type: "prose", extra: true })
        .success,
    ).toBe(false);
  });
});

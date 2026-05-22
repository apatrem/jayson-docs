import { describe, it, expect } from "vitest";
import { StableIdSchema } from "../../src/schema/stable-id";

describe("StableIdSchema", () => {
  it("accepts readable kebab-case IDs", () => {
    expect(StableIdSchema.parse("b1-prose-01")).toBe("b1-prose-01");
  });

  it("accepts UUIDs", () => {
    expect(StableIdSchema.parse("550e8400-e29b-41d4-a716-446655440000")).toBe(
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("rejects empty strings", () => {
    expect(StableIdSchema.safeParse("").success).toBe(false);
  });

  it("rejects IDs with spaces", () => {
    expect(StableIdSchema.safeParse("block 1").success).toBe(false);
  });

  it("rejects path-like IDs with slashes", () => {
    expect(StableIdSchema.safeParse("blocks/foo").success).toBe(false);
  });
});

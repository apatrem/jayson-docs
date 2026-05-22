import { describe, it, expect } from "vitest";
import { AssetPathSchema } from "../../src/schema/asset-path";

describe("AssetPathSchema", () => {
  it("accepts per-doc asset paths", () => {
    expect(AssetPathSchema.parse("assets/x.jpg")).toBe("assets/x.jpg");
  });

  it("accepts brand token references", () => {
    expect(AssetPathSchema.parse("$brand:logo.primary")).toBe(
      "$brand:logo.primary",
    );
  });

  it("rejects absolute paths", () => {
    const result = AssetPathSchema.safeParse("/abs/path");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/absolute/i);
    }
  });

  it("rejects parent-directory escapes", () => {
    const result = AssetPathSchema.safeParse("../foo");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/\.\./);
    }
  });

  it("rejects HTTP URLs", () => {
    const result = AssetPathSchema.safeParse("http://example.com/x.jpg");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/HTTP/i);
    }
  });
});

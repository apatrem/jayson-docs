import { describe, expect, it } from "vitest";
import { defaultBrand } from "../../src/brand/defaultBrand";
import { BrandTokensSchema } from "../../src/schema/brand";

describe("defaultBrand", () => {
  it("loads brand.example.yaml through the shared validated brand module", () => {
    expect(() => BrandTokensSchema.parse(defaultBrand)).not.toThrow();
    expect(defaultBrand.identity.name).toBe("Corporate Consulting Example");
  });
});

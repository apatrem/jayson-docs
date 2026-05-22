import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandTokensSchema } from "../../src/schema/brand";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("BrandTokensSchema", () => {
  const example = parse(
    readFileSync(join(repoRoot, "brand.example.yaml"), "utf8"),
  ) as unknown;

  it("validates brand.example.yaml", () => {
    const result = BrandTokensSchema.safeParse(example);
    expect(result.success).toBe(true);
  });

  it("rejects missing colors.brand.primary", () => {
    const brand = structuredClone(example) as {
      colors: { brand: Record<string, unknown> };
    };
    delete brand.colors.brand.primary;
    expect(BrandTokensSchema.safeParse(brand).success).toBe(false);
  });

  it("rejects invalid hex colors", () => {
    const brand = structuredClone(example) as {
      colors: { brand: { primary: string } };
    };
    brand.colors.brand.primary = "#FFF";
    const result = BrandTokensSchema.safeParse(brand);
    expect(result.success).toBe(false);
  });
});

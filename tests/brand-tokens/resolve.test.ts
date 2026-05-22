import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { resolveBrandToken } from "../../src/brand-tokens/resolve";
import { BrandTokensSchema } from "../../src/schema/brand";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

describe("resolveBrandToken", () => {
  it("resolves a direct color path", () => {
    expect(resolveBrandToken(brand, "colors.brand.primary")).toBe("#0B3D91");
  });

  it("resolves a one-level semantic alias", () => {
    expect(resolveBrandToken(brand, "colors.semantic.textPrimary")).toBe(
      "#1E293B",
    );
  });

  it("rejects unknown paths", () => {
    expect(() => resolveBrandToken(brand, "colors.brand.missing")).toThrow(
      /unknown token path/,
    );
  });
});

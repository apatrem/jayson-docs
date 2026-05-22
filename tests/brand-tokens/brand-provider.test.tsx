import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { useBrandTokens } from "../../src/brand-tokens/useBrandTokens";
import { BrandTokensSchema } from "../../src/schema/brand";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const testTokens = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

function Consumer() {
  const brand = useBrandTokens();
  return createElement("span", null, brand.identity.name);
}

describe("BrandProvider + useBrandTokens", () => {
  it("provides tokens inside the provider", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: testTokens }, createElement(Consumer)),
    );
    expect(html).toContain("Acme Strategy Partners");
  });

  it("throws when used outside the provider", () => {
    expect(() => renderToStaticMarkup(createElement(Consumer))).toThrow(
      /outside <BrandProvider>/,
    );
  });
});

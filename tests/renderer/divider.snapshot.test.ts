import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Divider } from "../../src/blocks/divider";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { DividerBlock } from "../../src/blocks/divider/schema";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: DividerBlock = {
  id: "test-divider",
  type: "divider",
};

describe("Divider snapshot (T-141a)", () => {
  it("renders document context under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Divider, { block, context: "document" }),
      ),
    );

    expect(html).toContain('data-block-type="divider"');
    expect(html).toContain("<hr");
  });

  it("renders deck context under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Divider, { block, context: "deck" }),
      ),
    );

    expect(html).toContain('data-block-type="divider"');
  });
});

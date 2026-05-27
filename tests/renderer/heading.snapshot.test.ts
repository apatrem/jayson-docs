import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Heading } from "../../src/renderer/blocks/Heading";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { HeadingBlock } from "../../src/schema/blocks/heading";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const h1Block: HeadingBlock = {
  id: "test-heading-h1",
  type: "heading",
  level: 1,
  text: "Main Document Title",
  numbered: true,
};

const h2Block: HeadingBlock = {
  id: "test-heading-h2",
  type: "heading",
  level: 2,
  text: "Section Heading",
  numbered: true,
};

describe("Heading snapshot (T-141a)", () => {
  it("renders h1 under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Heading, { block: h1Block }),
      ),
    );

    expect(html).toContain('data-block-type="heading"');
    expect(html).toContain('data-level="1"');
    expect(html).toContain("<h1");
    expect(html).toContain("Main Document Title");
    // brand heading color: #001050 (brand.dark)
    expect(html).toMatch(/#001050|#001A70/);
  });

  it("renders h2 under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Heading, { block: h2Block }),
      ),
    );

    expect(html).toContain('data-block-type="heading"');
    expect(html).toContain("<h2");
    expect(html).toContain("Section Heading");
  });
});

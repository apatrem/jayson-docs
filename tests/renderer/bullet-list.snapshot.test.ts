import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { BulletList } from "../../src/renderer/blocks/BulletList";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { BulletListBlock } from "../../src/schema/blocks/bullet-list";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: BulletListBlock = {
  id: "test-bullet-list",
  type: "bullet-list",
  items: [
    {
      text: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "First item" }],
          },
        ],
      },
    },
    {
      text: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Second item" }],
          },
        ],
      },
    },
  ],
};

describe("BulletList snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(BulletList, { block }),
      ),
    );

    expect(html).toContain('data-block-type="bullet-list"');
    expect(html).toContain("First item");
    expect(html).toContain("Second item");
    // structural baseline: list rendered as UL
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
  });
});

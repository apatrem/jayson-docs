import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Prose } from "../../src/renderer/blocks/Prose";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { ProseBlock } from "../../src/schema/blocks/prose";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: ProseBlock = {
  id: "test-prose",
  type: "prose",
  align: "left",
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "This is a prose block rendered under the new brand tokens." },
        ],
      },
    ],
  },
};

describe("Prose snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Prose, { block }),
      ),
    );

    expect(html).toContain('data-block-type="prose"');
    expect(html).toContain("prose block rendered under the new brand tokens");
    // body font: Arial
    expect(html).toContain("Arial");
  });
});

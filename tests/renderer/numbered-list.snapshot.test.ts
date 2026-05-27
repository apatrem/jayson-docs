import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { NumberedList } from "../../src/blocks/numbered-list";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { NumberedListBlock } from "../../src/blocks/numbered-list/schema";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: NumberedListBlock = {
  id: "test-numbered-list",
  type: "numbered-list",
  items: [
    {
      text: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Define scope" }],
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
            content: [{ type: "text", text: "Gather evidence" }],
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
            content: [{ type: "text", text: "Synthesise findings" }],
          },
        ],
      },
    },
  ],
};

describe("NumberedList snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(NumberedList, { block }),
      ),
    );

    expect(html).toContain('data-block-type="numbered-list"');
    expect(html).toContain("Define scope");
    expect(html).toContain("Gather evidence");
    expect(html).toContain("Synthesise findings");
    expect(html).toContain("<ol");
    expect(html).toContain("<li");
  });
});

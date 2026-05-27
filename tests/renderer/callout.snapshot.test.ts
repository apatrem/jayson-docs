import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Callout } from "../../src/renderer/blocks/Callout";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { CalloutBlock } from "../../src/schema/blocks/callout";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: CalloutBlock = {
  id: "test-callout",
  type: "callout",
  variant: "info",
  title: "Important Note",
  body: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "This is a callout body." }],
      },
    ],
  },
};

describe("Callout snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Callout, { block }),
      ),
    );

    expect(html).toContain('data-block-type="callout"');
    expect(html).toContain("Important Note");
    expect(html).toContain("This is a callout body.");
    // brand color used for border — primary navy is now #001A70
    expect(html).toMatch(/#001A70|#1A4E8A/);
  });
});

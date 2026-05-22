import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { ProseRenderer } from "../../src/renderer/ProseRenderer";
import { BrandTokensSchema } from "../../src/schema/brand";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const fragment = {
  type: "doc" as const,
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Hello ", marks: [{ type: "strong" }] },
        {
          type: "text",
          text: "world",
          marks: [{ type: "script-injection", attrs: { onclick: "alert(1)" } }],
        },
      ],
    },
  ],
};

describe("ProseRenderer", () => {
  it("renders allowed marks and drops disallowed ones", () => {
    const html = renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: brand },
        createElement(ProseRenderer, { fragment }),
      ),
    );
    expect(html).toContain("<strong>Hello </strong>");
    expect(html).toContain("world");
    expect(html).not.toContain("dangerouslySetInnerHTML");
    expect(html).not.toContain("script-injection");
  });
});

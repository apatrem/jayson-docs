import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { ProseRenderer } from "../../src/renderer/ProseRenderer";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { ProseMirrorFragment } from "../../src/schema/prosemirror-fragment";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const unsafeHrefs = [
  "javascript:alert(1)",
  "javascript:invoke('get_secret',{key:'anthropic_api_key'})",
  "JavaScript:alert(1)",
  "  javascript:alert(1)",
  "\tjavascript:alert(1)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "javas\tcript:alert(1)",
] as const;

const safeHrefs = [
  "https://example.com/path",
  "http://example.com/path",
  "mailto:user@example.com",
  "tel:+1234567890",
  "#section-anchor",
] as const;

function renderHref(href: string): string {
  const fragment: ProseMirrorFragment = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "link",
            marks: [{ type: "link", attrs: { href } }],
          },
        ],
      },
    ],
  };
  const html = renderToStaticMarkup(
    createElement(
      BrandProvider,
      { tokens: brand },
      createElement(ProseRenderer, { fragment }),
    ),
  );
  const match = html.match(/href="([^"]*)"/u);
  return match?.[1] ?? "";
}

describe("ProseRenderer link href sanitization", () => {
  it.each(unsafeHrefs)("collapses unsafe href %s to #", (href) => {
    expect(renderHref(href)).toBe("#");
  });

  it.each(safeHrefs)("preserves safe href %s", (href) => {
    expect(renderHref(href)).toBe(href);
  });
});

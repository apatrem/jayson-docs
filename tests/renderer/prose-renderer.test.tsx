import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { ProseRenderer } from "../../src/renderer/ProseRenderer";
import type { ProseMirrorFragment } from "../../src/schema/prosemirror-fragment";
import { BrandTokensSchema } from "../../src/schema/brand";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const marksFixture: ProseMirrorFragment = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "bold", marks: [{ type: "strong" }] },
        { type: "text", text: " " },
        { type: "text", text: "italic", marks: [{ type: "em" }] },
        { type: "text", text: " " },
        { type: "text", text: "underline", marks: [{ type: "underline" }] },
        { type: "text", text: " " },
        { type: "text", text: "strike", marks: [{ type: "strike" }] },
        { type: "text", text: " " },
        { type: "text", text: "code", marks: [{ type: "code" }] },
        { type: "text", text: " " },
        {
          type: "text",
          text: "link",
          marks: [{ type: "link", attrs: { href: "https://example.com/docs" } }],
        },
      ],
    },
    {
      type: "paragraph",
      content: [{ type: "hard_break" }, { type: "text", text: "after break" }],
    },
  ],
};

function renderFragment(fragment: ProseMirrorFragment): string {
  return renderToStaticMarkup(
    createElement(
      BrandProvider,
      { tokens: brand },
      createElement(ProseRenderer, { fragment }),
    ),
  );
}

describe("ProseRenderer (T-50)", () => {
  it("renders allowed marks (bold, italic, underline, code, link)", () => {
    const html = renderFragment(marksFixture);
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<u>underline</u>");
    expect(html).toContain("<s>strike</s>");
    expect(html).toMatch(/<code[^>]*>code<\/code>/);
    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain("<a ");
    expect(html).toContain("<br");
    expect(html).toContain("after break");
  });

  it("drops disallowed marks and node types", () => {
    const fragment: ProseMirrorFragment = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "safe",
              marks: [{ type: "script", attrs: { onclick: "x" } }],
            },
          ],
        },
        { type: "unknown-node", content: [{ type: "text", text: "gone" }] },
      ],
    };
    const html = renderFragment(fragment);
    expect(html).toContain("safe");
    expect(html).not.toContain("gone");
    expect(html).not.toContain("dangerouslySetInnerHTML");
  });

  it("is deterministic (SSR-safe static markup)", () => {
    const first = renderFragment(marksFixture);
    const second = renderFragment(marksFixture);
    expect(first).toBe(second);
    expect(first.length).toBeGreaterThan(0);
  });
});

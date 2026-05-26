import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { renderStaticHtmlForExport } from "../../src/export/render-static-html";
import { BrandTokensSchema, type BrandTokens } from "../../src/schema/brand";
import type { DocModel } from "../../src/schema/docmodel";

function loadBrand(): BrandTokens {
  const raw: unknown = parse(
    readFileSync(join(process.cwd(), "brand.example.yaml"), "utf8"),
  );
  return BrandTokensSchema.parse(raw);
}

const doc: Extract<DocModel, { kind: "document" }> = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: {
    client: "Acme",
    project: "Static HTML export",
    docKind: "proposal",
    tags: [],
    language: "en",
    status: "draft",
    archived: false,
    confidentialityLevel: "medium",
    owner: "owner@example.com",
    reviewers: [],
    createdAt: "2026-05-26T00:00:00Z",
    updatedAt: "2026-05-26T00:00:00Z",
    brandRef: "$brand:default",
  },
  sections: [
    {
      id: "section-1",
      title: "Overview",
      blocks: [
        {
          id: "prose-1",
          type: "prose",
          align: "left",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Safe <script>alert(1)</script> copy",
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
  comments: [],
};

describe("renderStaticHtmlForExport", () => {
  it("returns a print-ready self-contained HTML shell without script tags", async () => {
    const html = await renderStaticHtmlForExport(doc, loadBrand());

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("@page { size: A4 portrait; margin: 1.5cm; }");
    expect(html).toContain('data-doc-kind="document"');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toMatch(/<script\b/i);
  });
});

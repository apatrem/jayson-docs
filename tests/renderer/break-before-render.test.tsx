import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { DocumentRenderer, type DocumentModel } from "../../src/renderer/DocumentRenderer";
import { BrandTokensSchema, type BrandTokens } from "../../src/schema/brand";
import { DocModelSchema } from "../../src/schema/docmodel";

function loadBrand(): BrandTokens {
  const raw: unknown = parse(readFileSync(join(process.cwd(), "brand.example.yaml"), "utf8"));
  return BrandTokensSchema.parse(raw);
}

function prose(id: string, text: string, breakBefore?: boolean) {
  const base = {
    id,
    type: "prose" as const,
    align: "left" as const,
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
  };
  return breakBefore === undefined ? base : { ...base, breakBefore };
}

function buildDoc(): DocumentModel {
  const doc = {
    kind: "document",
    schemaVersion: "1.0.0",
    meta: {
      client: "Acme",
      project: "Breaks",
      docKind: "report",
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
        id: "11111111-1111-1111-1111-111111111111",
        title: "S",
        blocks: [prose("p1", "First"), prose("p2", "On a new page", true)],
      },
    ],
    comments: [],
  };
  const parsed = DocModelSchema.parse(doc);
  if (parsed.kind !== "document") throw new Error("expected document");
  return parsed;
}

describe("breakBefore — document render (ADR-0018, item 5)", () => {
  it("wraps a breakBefore block in a .doc-page-break container", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentRenderer, { doc: buildDoc(), brand: loadBrand() }),
    );
    expect(html).toContain('class="doc-page-break"');
    // Exactly one block opted in.
    expect(html.match(/class="doc-page-break"/gu)).toHaveLength(1);
    // Both blocks still render their text.
    expect(html).toContain("First");
    expect(html).toContain("On a new page");
  });
});

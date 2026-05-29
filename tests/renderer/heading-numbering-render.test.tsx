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

function heading(id: string, level: 1 | 2 | 3 | 4, text: string, numbered?: boolean) {
  return numbered === undefined
    ? { id, type: "heading" as const, level, text }
    : { id, type: "heading" as const, level, text, numbered };
}

function buildDoc(): DocumentModel {
  const doc = {
    kind: "document",
    schemaVersion: "1.0.0",
    meta: {
      client: "Acme",
      project: "Numbering",
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
        title: "A",
        blocks: [heading("h-intro", 1, "Intro"), heading("h-bg", 2, "Background")],
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        title: "B",
        blocks: [
          heading("h-approach", 1, "Approach"),
          heading("h-note", 2, "Note", false),
          heading("h-method", 2, "Method"),
        ],
      },
    ],
    comments: [],
  };
  const parsed = DocModelSchema.parse(doc);
  if (parsed.kind !== "document") throw new Error("expected document");
  return parsed;
}

function numbersInOrder(html: string): string[] {
  return Array.from(html.matchAll(/data-heading-number="([^"]*)"/gu), (m) => m[1] ?? "");
}

describe("heading numbering — document render (ADR-0018, item 4)", () => {
  it("numbers headings continuously across sections, skipping unnumbered", () => {
    const html = renderToStaticMarkup(
      createElement(DocumentRenderer, { doc: buildDoc(), brand: loadBrand() }),
    );
    // Intro=1, Background=1.1, Approach=2, [Note skipped], Method=2.1.
    expect(numbersInOrder(html)).toEqual(["1", "1.1", "2", "2.1"]);
    // The unnumbered heading still renders its text but carries no number marker.
    expect(html).toContain("Note");
    expect(html).toContain('data-numbered="false"');
  });
});

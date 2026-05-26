import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    vi.restoreAllMocks();
  });

  it("returns a print-ready self-contained HTML shell without script tags", async () => {
    const html = await renderStaticHtmlForExport(doc, loadBrand());

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("@page { size: A4 portrait; margin: 1.5cm; }");
    expect(html).toContain('data-doc-kind="document"');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toMatch(/<script\b/i);
  });

  it("inlines image assets as data URIs", async () => {
    const imageDoc: Extract<DocModel, { kind: "document" }> = {
      ...doc,
      sections: [
        {
          ...doc.sections[0]!,
          blocks: [
            ...doc.sections[0]!.blocks,
            {
              id: "image-1",
              type: "image",
              src: "assets/photo.jpg",
              alt: "Team workshop",
              caption: "Workshop photo",
              width: "medium",
              align: "center",
            },
          ],
        },
      ],
    };
    const invokeMock = vi.fn((cmd: string, args: unknown) => {
      expect(cmd).toBe("read_binary_file");
      expect(args).toEqual({
        path: "/Users/me/Documents/proposal/assets/photo.jpg",
      });
      return Promise.resolve([0xff, 0xd8, 0xff]);
    });
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    expect(html).toContain('src="data:image/jpeg;base64,/9j/"');
    expect(html).not.toContain("/Users/me/Documents/proposal/assets/photo.jpg");
    expect(html).not.toContain("assets/photo.jpg");
  });
});

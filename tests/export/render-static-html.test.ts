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
    const imageDoc = docWithImages([{ id: "image-1", src: "assets/photo.jpg" }]);
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

  it("uses a placeholder when the binary IPC rejects the 5 MB image cap", async () => {
    const imageDoc = docWithImages([{ id: "image-1", src: "assets/photo.jpg" }]);
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {
        invoke: vi.fn(() => Promise.reject(new Error("file exceeds 5MB export limit"))),
      },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    expect(decodedSvgDataUris(html).join("\n")).toContain("Image too large to export");
    expect(html).not.toContain("data:image/jpeg;base64");
  });

  it("uses placeholders after the 50 MB total image payload cap", async () => {
    const imageDoc = docWithImages([
      { id: "image-1", src: "assets/photo-1.jpg" },
      { id: "image-2", src: "assets/photo-2.jpg" },
    ]);
    const totalCapOverflowBytes: ArrayLike<number> = {
      length: 50 * 1024 * 1024,
      0: 0xff,
    };
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {
        invoke: vi.fn((_cmd: string, args: { path: string }) =>
          Promise.resolve(args.path.endsWith("photo-1.jpg") ? [0xff] : totalCapOverflowBytes),
        ),
      },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    expect(html).toContain('src="data:image/jpeg;base64,/w=="');
    expect(decodedSvgDataUris(html).join("\n")).toContain("Image too large to export");
  });

  it("removes active SVG content before inlining image assets", async () => {
    const imageDoc = docWithImages([{ id: "image-1", src: "assets/vector.svg" }]);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><g onload="alert(1)"><text>Safe</text></g></svg>`;
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {
        invoke: vi.fn(() => Promise.resolve(Array.from(Buffer.from(svg, "utf8")))),
      },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    const [decodedSvg] = decodedSvgDataUris(html);
    expect(decodedSvg).toContain("<svg");
    expect(decodedSvg).toContain("Safe");
    expect(decodedSvg).not.toMatch(/<script\b/iu);
    expect(decodedSvg).not.toMatch(/\sonload=/iu);
  });
});

function docWithImages(
  images: Array<{ id: string; src: string }>,
): Extract<DocModel, { kind: "document" }> {
  return {
    ...doc,
    sections: [
      {
        ...doc.sections[0]!,
        blocks: [
          ...doc.sections[0]!.blocks,
          ...images.map(({ id, src }) => ({
            id,
            type: "image" as const,
            src,
            alt: "Team workshop",
            caption: "Workshop photo",
            width: "medium" as const,
            align: "center" as const,
          })),
        ],
      },
    ],
  };
}

function decodedSvgDataUris(html: string): string[] {
  return Array.from(
    html.matchAll(/data:image\/svg\+xml;base64,([^"]+)/giu),
    (match) => Buffer.from(match[1] ?? "", "base64").toString("utf8"),
  );
}

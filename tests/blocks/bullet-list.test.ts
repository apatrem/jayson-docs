import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  BulletListTipTapNode,
  bulletListBlockToProseMirror,
  proseMirrorToBulletListBlock,
  BulletList,
} from "../../src/blocks/bullet-list";
import {
  BulletListBlockSchema,
  type BulletListBlock,
} from "../../src/blocks/bullet-list/schema";
import type { BrandTokens } from "../../src/schema/brand";

const fragment = (text: string) => ({
  type: "doc" as const,
  content: [
    {
      type: "paragraph" as const,
      content: [{ type: "text" as const, text }],
    },
  ],
});

const validFlat: BulletListBlock = {
  id: "b2-bullets-01",
  type: "bullet-list",
  items: [
    { text: fragment("Cost volatility") },
    { text: fragment("Regulatory drift") },
  ],
};

const validNested: BulletListBlock = {
  id: "b2-bullets-nested",
  type: "bullet-list",
  items: [
    {
      text: fragment("Parent item"),
      children: [{ text: fragment("Nested point") }],
    },
  ],
};

const testBrandTokens = {
  schemaVersion: "1.0.0",
  lastUpdated: "2026-05-21",
  identity: { name: "Test" },
  logo: { primary: { svg: "logo.svg", minWidthPx: 80, intrinsicAspect: 3.2 } },
  colors: {
    brand: {
      primary: "#0B3D91",
      secondary: "#E8A33D",
      dark: "#0A1A2F",
      light: "#F4F7FC",
    },
    neutral: {
      "0": "#FFFFFF",
      "200": "#E2E8F0",
      "600": "#475569",
      "800": "#1E293B",
    },
    semantic: {
      surfaceBackground: "neutral.200",
      border: "neutral.200",
      textPrimary: "neutral.800",
      textSecondary: "neutral.600",
      link: "brand.primary",
      headingPrimary: "brand.dark",
      accent: "brand.secondary",
    },
    chartPalette: {
      qualitative: [
        "#0B3D91",
        "#E8A33D",
        "#2D9C5A",
        "#C44536",
        "#7C3AED",
        "#0891B2",
        "#65A30D",
        "#DB2777",
      ],
      sequential: ["#F4F7FC", "#C9D7EF", "#7FA3DC", "#3870C0", "#0B3D91"],
    },
  },
  typography: {
    fonts: {
      heading: { family: "Heading", source: "system" as const, weights: [600] },
      body: { family: "Body", source: "system" as const, weights: [400] },
      mono: { family: "Mono", source: "system" as const, weights: [400] },
    },
    scale: { h1: 32, h2: 24, h3: 20, h4: 16, body: 11, caption: 9 },
    lineHeight: { tight: 1.15, normal: 1.5 },
  },
  spacing: { unit: 4, scale: [0, 1, 2, 3, 4, 6, 8] },
  page: {
    size: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 24, right: 18, bottom: 22, left: 18 },
  },
  deck: {
    slideSize: "16:9" as const,
    dimensionsPx: { width: 1920, height: 1080 },
    margins: { top: 72, right: 96, bottom: 72, left: 96 },
  },
  elements: {},
  charts: {},
} satisfies BrandTokens;

describe("BulletListBlockSchema — valid fixtures", () => {
  it("accepts a flat bullet list", () => {
    expect(BulletListBlockSchema.parse(validFlat)).toEqual(validFlat);
  });

  it("accepts one level of nested children", () => {
    expect(BulletListBlockSchema.parse(validNested)).toEqual(validNested);
  });
});

describe("BulletListBlockSchema — invalid fixtures", () => {
  it("rejects empty items", () => {
    expect(
      BulletListBlockSchema.safeParse({ ...validFlat, items: [] }).success,
    ).toBe(false);
  });

  it("rejects more than 12 top-level items", () => {
    const items = Array.from({ length: 13 }, (_, i) => ({
      text: fragment(`item ${i}`),
    }));
    expect(
      BulletListBlockSchema.safeParse({ ...validFlat, items }).success,
    ).toBe(false);
  });

  it("rejects more than 8 nested children", () => {
    const children = Array.from({ length: 9 }, (_, i) => ({
      text: fragment(`nested ${i}`),
    }));
    expect(
      BulletListBlockSchema.safeParse({
        ...validFlat,
        items: [{ text: fragment("parent"), children }],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      BulletListBlockSchema.safeParse({ ...validFlat, extra: true }).success,
    ).toBe(false);
  });
});

describe("BulletList renderer", () => {
  const renderWithBrand = (block: BulletListBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(BulletList, { block }),
      ),
    );

  it("renders ul with block metadata", () => {
    const html = renderWithBrand(validFlat);
    expect(html).toContain("<ul");
    expect(html).toContain('data-block-type="bullet-list"');
    expect(html).toContain("Cost volatility");
  });

  it("renders nested ul for children", () => {
    const html = renderWithBrand(validNested);
    expect(html).toContain("Parent item");
    expect(html).toContain("Nested point");
    expect((html.match(/<ul/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("is deterministic", () => {
    const first = renderWithBrand(validFlat);
    const second = renderWithBrand(validFlat);
    expect(first).toBe(second);
  });
});

describe("BulletList mapping", () => {
  it("round-trips a flat list losslessly", () => {
    const pm = bulletListBlockToProseMirror(validFlat);
    expect(proseMirrorToBulletListBlock(pm)).toEqual(validFlat);
  });

  it("round-trips nested children losslessly", () => {
    const pm = bulletListBlockToProseMirror(validNested);
    expect(proseMirrorToBulletListBlock(pm)).toEqual(validNested);
  });
});

describe("BulletList TipTap node", () => {
  it("registers insertBulletList command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, BulletListTipTapNode],
    });
    editor.commands.insertBulletList();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"bulletList"');
    editor.destroy();
  });
});

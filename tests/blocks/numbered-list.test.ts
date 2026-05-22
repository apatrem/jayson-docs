import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  NumberedListTipTapNode,
  numberedListBlockToProseMirror,
  proseMirrorToNumberedListBlock,
} from "../../src/editor/nodes/NumberedListNode";
import { NumberedList } from "../../src/renderer/blocks/NumberedList";
import {
  NumberedListBlockSchema,
  type NumberedListBlock,
} from "../../src/schema/blocks/numbered-list";
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

const validList: NumberedListBlock = {
  id: "b3-numbered-01",
  type: "numbered-list",
  items: [
    { text: fragment("Phase 1 discovery") },
    { text: fragment("Phase 2 sizing") },
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

describe("NumberedListBlockSchema — valid fixtures", () => {
  it("accepts a numbered list", () => {
    expect(NumberedListBlockSchema.parse(validList)).toEqual(validList);
  });
});

describe("NumberedListBlockSchema — invalid fixtures", () => {
  it("rejects empty items", () => {
    expect(
      NumberedListBlockSchema.safeParse({ ...validList, items: [] }).success,
    ).toBe(false);
  });

  it("rejects more than 12 items", () => {
    const items = Array.from({ length: 13 }, (_, i) => ({
      text: fragment(`step ${i}`),
    }));
    expect(
      NumberedListBlockSchema.safeParse({ ...validList, items }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      NumberedListBlockSchema.safeParse({ ...validList, extra: true }).success,
    ).toBe(false);
  });
});

describe("NumberedList renderer", () => {
  const renderWithBrand = (block: NumberedListBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(NumberedList, { block }),
      ),
    );

  it("renders ol with block metadata", () => {
    const html = renderWithBrand(validList);
    expect(html).toContain("<ol");
    expect(html).toContain('data-block-type="numbered-list"');
    expect(html).toContain("Phase 1 discovery");
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validList)).toBe(renderWithBrand(validList));
  });
});

describe("NumberedList mapping", () => {
  it("round-trips losslessly", () => {
    const pm = numberedListBlockToProseMirror(validList);
    expect(proseMirrorToNumberedListBlock(pm)).toEqual(validList);
  });
});

describe("NumberedList TipTap node", () => {
  it("registers insertNumberedList command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, NumberedListTipTapNode],
    });
    editor.commands.insertNumberedList();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"numberedList"');
    editor.destroy();
  });
});

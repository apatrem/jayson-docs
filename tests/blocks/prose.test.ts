import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  ProseTipTapNode,
  proseBlockToProseMirror,
  proseMirrorToProseBlock,
  Prose,
} from "../../src/blocks/prose";
import { ProseBlockSchema, type ProseBlock } from "../../src/blocks/prose/schema";
import type { BrandTokens } from "../../src/schema/brand";

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
    scale: { body: 11, bodyLg: 13, caption: 9 },
    lineHeight: { normal: 1.5 },
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

const validProse: ProseBlock = {
  id: "b1-prose-01",
  type: "prose",
  align: "left",
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Hello world" }],
      },
    ],
  },
};

describe("ProseBlockSchema — valid fixtures", () => {
  it("accepts a complete prose block", () => {
    expect(ProseBlockSchema.parse(validProse)).toEqual(validProse);
  });
});

describe("ProseBlockSchema — invalid fixtures", () => {
  it("rejects unknown keys", () => {
    expect(
      ProseBlockSchema.safeParse({ ...validProse, extra: true }).success,
    ).toBe(false);
  });
});

describe("Prose renderer", () => {
  const renderWithBrand = (block: ProseBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(Prose, { block }),
      ),
    );

  it("renders prose content with brand text color", () => {
    const html = renderWithBrand(validProse);
    expect(html).toContain('data-block-type="prose"');
    expect(html).toContain("Hello world");
    expect(html).toContain("#1E293B");
  });
});

describe("Prose mapping", () => {
  it("round-trips losslessly", () => {
    const pm = proseBlockToProseMirror(validProse);
    const back = proseMirrorToProseBlock(pm);
    expect(back).toEqual(validProse);
  });
});

describe("Prose TipTap node", () => {
  it("registers insertProse command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, ProseTipTapNode],
    });
    editor.commands.insertProse({ align: "justify" });
    const json = editor.getJSON();
    expect(JSON.stringify(json)).toContain('"type":"prose"');
    editor.destroy();
  });
});

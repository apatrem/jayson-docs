import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  HeadingTipTapNode,
  headingBlockToProseMirror,
  proseMirrorToHeadingBlock,
  Heading,
} from "../../src/blocks/heading";
import {
  HeadingBlockSchema,
  type HeadingBlock,
} from "../../src/blocks/heading/schema";
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

const validHeading: HeadingBlock = {
  id: "b2-heading-01",
  type: "heading",
  level: 2,
  text: "Strategic context",
  numbered: true,
};

describe("HeadingBlockSchema — valid fixtures", () => {
  it("accepts a complete heading block", () => {
    expect(HeadingBlockSchema.parse(validHeading)).toEqual(validHeading);
  });
});

describe("HeadingBlockSchema — invalid fixtures", () => {
  it("rejects invalid level", () => {
    expect(
      HeadingBlockSchema.safeParse({ ...validHeading, level: 5 }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      HeadingBlockSchema.safeParse({ ...validHeading, extra: true }).success,
    ).toBe(false);
  });
});

describe("Heading renderer", () => {
  const renderWithBrand = (block: HeadingBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(Heading, { block }),
      ),
    );

  it("renders h2 with brand heading color", () => {
    const html = renderWithBrand(validHeading);
    expect(html).toContain("<h2");
    expect(html).toContain("Strategic context");
    expect(html).toContain("#0A1A2F");
  });
});

describe("Heading mapping", () => {
  it("round-trips losslessly", () => {
    const pm = headingBlockToProseMirror(validHeading);
    const back = proseMirrorToHeadingBlock(pm);
    expect(back).toEqual(validHeading);
  });
});

describe("Heading TipTap node", () => {
  it("registers insertHeading command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, HeadingTipTapNode],
    });
    editor.commands.insertHeading({ level: 3, text: "Objectives" });
    const json = editor.getJSON();
    expect(JSON.stringify(json)).toContain('"type":"heading"');
    editor.destroy();
  });
});

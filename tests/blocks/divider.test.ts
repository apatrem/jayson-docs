import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  DividerTipTapNode,
  dividerBlockToProseMirror,
  proseMirrorToDividerBlock,
} from "../../src/editor/nodes/DividerNode";
import { Divider } from "../../src/renderer/blocks/Divider";
import {
  DividerBlockSchema,
  type DividerBlock,
} from "../../src/schema/blocks/divider";
import type { BrandTokens } from "../../src/schema/brand";

const validDocDivider: DividerBlock = {
  id: "b5-divider-01",
  type: "divider",
};

const validDeckDivider: DividerBlock = {
  id: "s3-divider-block",
  type: "divider",
  label: "Why now",
  subtitle: "Market context",
  numbering: "Part 02",
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
      sequential: ["#F4F7FC", "#7FA3DC", "#0B3D91"],
    },
  },
  typography: {
    fonts: {
      heading: { family: "Heading", source: "system" as const, weights: [600] },
      body: { family: "Body", source: "system" as const, weights: [400] },
      mono: { family: "Mono", source: "system" as const, weights: [400] },
    },
    scale: {
      body: 11,
      bodyLg: 13,
      caption: 9,
      h1: 32,
      h2: 24,
      h3: 20,
      h4: 16,
      deckTitle: 44,
    },
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

describe("DividerBlockSchema — valid fixtures", () => {
  it("accepts a bare document page-break divider", () => {
    expect(DividerBlockSchema.parse(validDocDivider)).toEqual(validDocDivider);
  });

  it("accepts deck divider fields", () => {
    expect(DividerBlockSchema.parse(validDeckDivider)).toEqual(validDeckDivider);
  });
});

describe("DividerBlockSchema — invalid fixtures", () => {
  it("rejects label longer than 80 chars", () => {
    expect(
      DividerBlockSchema.safeParse({
        ...validDeckDivider,
        label: "x".repeat(81),
      }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      DividerBlockSchema.safeParse({ ...validDocDivider, extra: true }).success,
    ).toBe(false);
  });
});

describe("Divider renderer", () => {
  const renderWithBrand = (
    block: DividerBlock,
    context: "document" | "deck" = "document",
  ) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(Divider, { block, context }),
      ),
    );

  it("renders document page break as hr", () => {
    const html = renderWithBrand(validDocDivider);
    expect(html).toContain("<hr");
    expect(html).toContain('data-block-type="divider"');
    expect(html).toContain("page-break-before:always");
  });

  it("renders deck divider slide with label and brand dark background", () => {
    const html = renderWithBrand(validDeckDivider, "deck");
    expect(html).toContain('data-render-context="deck"');
    expect(html).toContain("Why now");
    expect(html).toContain("Part 02");
    expect(html).toContain(testBrandTokens.colors.brand.dark);
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validDocDivider)).toBe(renderWithBrand(validDocDivider));
  });
});

describe("Divider mapping", () => {
  it("round-trips losslessly", () => {
    const pm = dividerBlockToProseMirror(validDeckDivider);
    expect(proseMirrorToDividerBlock(pm)).toEqual(validDeckDivider);
  });
});

describe("Divider TipTap node", () => {
  it("registers insertDivider command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, DividerTipTapNode],
    });
    editor.commands.insertDivider({ label: "Section" });
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"docDivider"');
    editor.destroy();
  });
});

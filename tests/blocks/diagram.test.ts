import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  DiagramTipTapNode,
  diagramBlockToProseMirror,
  proseMirrorToDiagramBlock,
  Diagram,
} from "../../src/blocks/diagram";
import { renderMermaidSvg } from "../../src/renderer/mermaid";
import {
  DiagramBlockSchema,
  diagramMaxWidthPercent,
  type DiagramBlock,
} from "../../src/blocks/diagram/schema";
import type { BrandTokens } from "../../src/schema/brand";

const validDiagram: DiagramBlock = {
  id: "b4-diagram-01",
  type: "diagram",
  source: "graph TD\n  A[Assess] --> B[Decide]",
  title: "Decision flow",
  caption: "Simplified engagement process.",
  width: "large",
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
    status: {
      info: "#1D4ED8",
      success: "#15803D",
      warning: "#B45309",
      error: "#B91C1C",
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

describe("DiagramBlockSchema — valid fixtures", () => {
  it("accepts a diagram with title, caption, and source", () => {
    expect(DiagramBlockSchema.parse(validDiagram)).toEqual(validDiagram);
  });

  it("applies width default", () => {
    const { width: _w, ...rest } = validDiagram;
    expect(DiagramBlockSchema.parse(rest).width).toBe("large");
  });

  it("exposes width percent helper", () => {
    expect(diagramMaxWidthPercent("full")).toBe("100%");
    expect(diagramMaxWidthPercent("medium")).toBe("60%");
  });
});

describe("DiagramBlockSchema — invalid fixtures", () => {
  it("rejects empty source", () => {
    expect(
      DiagramBlockSchema.safeParse({ ...validDiagram, source: "" }).success,
    ).toBe(false);
  });

  it("rejects source longer than 4000 chars", () => {
    expect(
      DiagramBlockSchema.safeParse({
        ...validDiagram,
        source: "x".repeat(4001),
      }).success,
    ).toBe(false);
  });

  it("rejects unknown width", () => {
    expect(
      DiagramBlockSchema.safeParse({ ...validDiagram, width: "small" }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      DiagramBlockSchema.safeParse({ ...validDiagram, extra: true }).success,
    ).toBe(false);
  });
});

describe("Diagram renderer", () => {
  const renderWithBrand = (block: DiagramBlock, renderedSvg?: string) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(
          Diagram,
          renderedSvg ? { block, renderedSvg } : { block },
        ),
      ),
    );

  it("renders figure with mermaid source in SSR shell mode", () => {
    const html = renderWithBrand(validDiagram);
    expect(html).toContain('data-block-type="diagram"');
    expect(html).toContain(`data-block-id="${validDiagram.id}"`);
    expect(html).toContain("graph TD");
    expect(html).toContain("Decision flow");
    expect(html).toContain(testBrandTokens.colors.neutral["200"]);
  });

  it("renders pre-rendered SVG when provided", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>ok</text></svg>';
    const html = renderWithBrand(validDiagram, svg);
    expect(html).toContain('data-diagram-rendered="svg"');
    expect(html).toContain("data:image/svg+xml");
    expect(html).not.toContain("<pre");
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validDiagram)).toBe(renderWithBrand(validDiagram));
  });
});

describe("Diagram mermaid render", () => {
  it("exposes renderMermaidSvg for export-time pre-render", () => {
    expect(typeof renderMermaidSvg).toBe("function");
  });
});

describe("Diagram mapping", () => {
  it("round-trips losslessly", () => {
    const pm = diagramBlockToProseMirror(validDiagram);
    expect(proseMirrorToDiagramBlock(pm)).toEqual(validDiagram);
  });
});

describe("Diagram TipTap node", () => {
  it("registers insertDiagram command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, DiagramTipTapNode],
    });
    editor.commands.insertDiagram();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"docDiagram"');
    editor.destroy();
  });
});

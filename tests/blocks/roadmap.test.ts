import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  RoadmapTipTapNode,
  roadmapBlockToProseMirror,
  proseMirrorToRoadmapBlock,
  Roadmap,
  workstreamOffsetPercent,
  workstreamWidthPercent,
} from "../../src/blocks/roadmap";
import {
  RoadmapBlockSchema,
  type RoadmapBlock,
} from "../../src/blocks/roadmap/schema";
import type { BrandTokens } from "../../src/schema/brand";

const validRoadmap: RoadmapBlock = {
  id: "b4-roadmap-01",
  type: "roadmap",
  timeUnit: "month",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  workstreams: [
    {
      label: "Diagnostic",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      color: "brand.primary",
    },
    {
      label: "Delivery",
      startDate: "2026-04-01",
      endDate: "2026-10-31",
      color: "auto",
    },
  ],
  milestones: [{ label: "Board review", date: "2026-11-15" }],
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

describe("RoadmapBlockSchema — valid fixtures", () => {
  it("accepts a roadmap with workstreams and milestones", () => {
    expect(RoadmapBlockSchema.parse(validRoadmap)).toEqual(validRoadmap);
  });
});

describe("RoadmapBlockSchema — invalid fixtures", () => {
  it("rejects endDate before startDate", () => {
    expect(
      RoadmapBlockSchema.safeParse({
        ...validRoadmap,
        endDate: "2025-12-31",
      }).success,
    ).toBe(false);
  });

  it("rejects milestone outside range", () => {
    expect(
      RoadmapBlockSchema.safeParse({
        ...validRoadmap,
        milestones: [{ label: "Late", date: "2027-01-01" }],
      }).success,
    ).toBe(false);
  });

  it("rejects empty workstreams", () => {
    expect(
      RoadmapBlockSchema.safeParse({ ...validRoadmap, workstreams: [] }).success,
    ).toBe(false);
  });
});

describe("Roadmap layout helpers", () => {
  it("computes bar offsets and widths from ISO dates", () => {
    const ws = validRoadmap.workstreams[0]!;
    expect(workstreamOffsetPercent(validRoadmap, ws.startDate)).toBe(0);
    expect(workstreamWidthPercent(validRoadmap, ws)).toBeGreaterThan(0);
  });
});

describe("Roadmap renderer", () => {
  const renderWithBrand = (block: RoadmapBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(Roadmap, { block }),
      ),
    );

  it("renders workstream rows and milestone markers", () => {
    const html = renderWithBrand(validRoadmap);
    expect(html).toContain('data-block-type="roadmap"');
    expect(html).toContain("Diagnostic");
    expect(html).toContain("Board review");
    expect(html).toContain("#0B3D91");
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validRoadmap)).toBe(renderWithBrand(validRoadmap));
  });
});

describe("Roadmap mapping", () => {
  it("round-trips losslessly", () => {
    const pm = roadmapBlockToProseMirror(validRoadmap) as {
      attrs: { blockId: string; payload: string; note: string };
    };
    expect(proseMirrorToRoadmapBlock(pm)).toEqual(validRoadmap);
  });
});

describe("Roadmap TipTap node", () => {
  it("registers insertRoadmap command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, RoadmapTipTapNode],
    });
    editor.commands.insertRoadmap();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"docRoadmap"');
    editor.destroy();
  });
});

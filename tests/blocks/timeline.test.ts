import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  TimelineTipTapNode,
  timelineBlockToProseMirror,
  proseMirrorToTimelineBlock,
  Timeline,
} from "../../src/blocks/timeline";
import {
  TimelineBlockSchema,
  type TimelineBlock,
} from "../../src/blocks/timeline/schema";
import type { BrandTokens } from "../../src/schema/brand";

const validTimeline: TimelineBlock = {
  id: "b3-timeline-01",
  type: "timeline",
  orientation: "horizontal",
  connector: "arrow",
  phases: [
    {
      label: "Diagnostic",
      subtitle: "Weeks 1–3",
      body: "Baseline energy footprint and OPEX exposure across sites.",
      duration: "3 weeks",
    },
    {
      label: "Market scan",
      subtitle: "Weeks 4–6",
      body: "SMR vendor landscape; offtake terms.",
      duration: "3 weeks",
    },
    {
      label: "Recommendation",
      subtitle: "Weeks 11–12",
      duration: "2 weeks",
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
    scale: {
      h1: 32,
      h2: 24,
      h3: 20,
      h4: 16,
      body: 11,
      bodyLg: 13,
      caption: 9,
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

describe("TimelineBlockSchema — valid fixtures", () => {
  it("accepts a horizontal timeline from sample-proposal shape", () => {
    expect(TimelineBlockSchema.parse(validTimeline)).toEqual(validTimeline);
  });

  it("applies orientation and connector defaults", () => {
    const parsed = TimelineBlockSchema.parse({
      id: "b3-timeline-02",
      type: "timeline",
      phases: [
        { label: "Start" },
        { label: "End" },
      ],
    });
    expect(parsed.orientation).toBe("horizontal");
    expect(parsed.connector).toBe("arrow");
  });
});

describe("TimelineBlockSchema — invalid fixtures", () => {
  it("rejects fewer than 2 phases", () => {
    expect(
      TimelineBlockSchema.safeParse({
        ...validTimeline,
        phases: [{ label: "Only" }],
      }).success,
    ).toBe(false);
  });

  it("rejects more than 7 phases", () => {
    const phases = Array.from({ length: 8 }, (_, i) => ({
      label: `Phase ${i}`,
    }));
    expect(
      TimelineBlockSchema.safeParse({ ...validTimeline, phases }).success,
    ).toBe(false);
  });

  it("rejects label longer than 40 chars", () => {
    expect(
      TimelineBlockSchema.safeParse({
        ...validTimeline,
        phases: [{ label: "x".repeat(41) }, { label: "ok" }],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      TimelineBlockSchema.safeParse({ ...validTimeline, extra: true }).success,
    ).toBe(false);
  });
});

describe("Timeline renderer", () => {
  const renderWithBrand = (block: TimelineBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(Timeline, { block }),
      ),
    );

  it("renders phases with connector arrows", () => {
    const html = renderWithBrand(validTimeline);
    expect(html).toContain('data-block-type="timeline"');
    expect(html).toContain("Diagnostic");
    expect(html).toContain("→");
    expect(html).toContain("#0B3D91");
  });

  it("renders vertical orientation", () => {
    const html = renderWithBrand({
      ...validTimeline,
      orientation: "vertical",
      connector: "line",
    });
    expect(html).toContain('data-orientation="vertical"');
    expect(html).toContain("—");
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validTimeline)).toBe(renderWithBrand(validTimeline));
  });
});

describe("Timeline mapping", () => {
  it("round-trips losslessly", () => {
    const pm = timelineBlockToProseMirror(validTimeline);
    expect(proseMirrorToTimelineBlock(pm)).toEqual(validTimeline);
  });
});

describe("Timeline TipTap node", () => {
  it("registers insertTimeline command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, TimelineTipTapNode],
    });
    editor.commands.insertTimeline();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"docTimeline"');
    editor.destroy();
  });
});

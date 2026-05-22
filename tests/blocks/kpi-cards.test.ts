import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  KpiCardsTipTapNode,
  kpiCardsBlockToProseMirror,
  proseMirrorToKpiCardsBlock,
} from "../../src/editor/nodes/KpiCardsNode";
import { KpiCards } from "../../src/renderer/blocks/KpiCards";
import {
  KpiCardsBlockSchema,
  kpiEmphasisColorRef,
  kpiTrendColorRef,
  type KpiCardsBlock,
} from "../../src/schema/blocks/kpi-cards";
import type { BrandTokens } from "../../src/schema/brand";

const validKpis: KpiCardsBlock = {
  id: "b1-kpi-01",
  type: "kpi-cards",
  cards: [
    {
      value: "€42M",
      label: "Annual fuel-cost exposure",
      sublabel: "Across 3 sites (2025 baseline)",
      trend: "up",
      emphasis: "negative",
    },
    {
      value: "-72%",
      label: "Potential CO₂ reduction",
      trend: "down",
      emphasis: "positive",
    },
    {
      value: "12 wk",
      label: "Engagement duration",
      trend: "none",
      emphasis: "brand",
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

describe("KpiCardsBlockSchema — valid fixtures", () => {
  it("accepts a multi-card KPI block from sample-proposal shape", () => {
    expect(KpiCardsBlockSchema.parse(validKpis)).toEqual(validKpis);
  });

  it("applies trend and emphasis defaults", () => {
    const parsed = KpiCardsBlockSchema.parse({
      id: "b1-kpi-02",
      type: "kpi-cards",
      cards: [{ value: "3", label: "Sites" }],
    });
    expect(parsed.cards[0]?.trend).toBe("none");
    expect(parsed.cards[0]?.emphasis).toBe("neutral");
  });
});

describe("KpiCardsBlockSchema — invalid fixtures", () => {
  it("rejects empty cards array", () => {
    expect(
      KpiCardsBlockSchema.safeParse({ ...validKpis, cards: [] }).success,
    ).toBe(false);
  });

  it("rejects more than 4 cards", () => {
    const cards = Array.from({ length: 5 }, (_, i) => ({
      value: String(i),
      label: `Metric ${i}`,
    }));
    expect(
      KpiCardsBlockSchema.safeParse({ ...validKpis, cards }).success,
    ).toBe(false);
  });

  it("rejects label longer than 60 chars", () => {
    expect(
      KpiCardsBlockSchema.safeParse({
        ...validKpis,
        cards: [{ value: "1", label: "x".repeat(61) }],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      KpiCardsBlockSchema.safeParse({ ...validKpis, extra: true }).success,
    ).toBe(false);
  });
});

describe("KpiCards renderer", () => {
  const renderWithBrand = (block: KpiCardsBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(KpiCards, { block }),
      ),
    );

  it("renders KPI values and labels with block metadata", () => {
    const html = renderWithBrand(validKpis);
    expect(html).toContain('data-block-type="kpi-cards"');
    expect(html).toContain("€42M");
    expect(html).toContain("Annual fuel-cost exposure");
    expect(html).toContain("Across 3 sites");
  });

  it("uses emphasis colors from brand tokens", () => {
    const html = renderWithBrand(validKpis);
    expect(html).toContain(testBrandTokens.colors.status.error);
    expect(html).toContain(testBrandTokens.colors.status.success);
    expect(html).toContain(testBrandTokens.colors.brand.primary);
  });

  it("renders trend glyphs for non-none trends", () => {
    const html = renderWithBrand(validKpis);
    expect(html).toContain("↑");
    expect(html).toContain("↓");
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validKpis)).toBe(renderWithBrand(validKpis));
  });
});

describe("KpiCards mapping", () => {
  it("round-trips losslessly", () => {
    const pm = kpiCardsBlockToProseMirror(validKpis);
    expect(proseMirrorToKpiCardsBlock(pm)).toEqual(validKpis);
  });
});

describe("KpiCards TipTap node", () => {
  it("registers insertKpiCards command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, KpiCardsTipTapNode],
    });
    editor.commands.insertKpiCards();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"kpiCards"');
    editor.destroy();
  });
});

describe("kpi color ref helpers", () => {
  it("maps emphasis variants to color paths", () => {
    expect(kpiEmphasisColorRef("positive")).toBe("colors.status.success");
    expect(kpiEmphasisColorRef("brand")).toBe("colors.brand.primary");
  });

  it("maps trend variants to color paths", () => {
    expect(kpiTrendColorRef("up")).toBe("colors.status.success");
    expect(kpiTrendColorRef("flat")).toBe("colors.semantic.textSecondary");
  });
});

import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { ChartDataPanel } from "../../src/editor/panels/ChartDataPanel";
import {
  ChartTipTapNode,
  chartBlockToProseMirror,
  proseMirrorToChartBlock,
} from "../../src/editor/nodes/ChartNode";
import { getEChartsOption } from "../../src/renderer/blocks/Chart";
import {
  ChartBlockSchema,
  defaultYZeroBased,
  hasCategoryAxis,
  type ChartBlock,
} from "../../src/schema/blocks/chart";
import type { BrandTokens } from "../../src/schema/brand";

const minimalBarChart: ChartBlock = {
  id: "11111111-1111-1111-1111-111111111111",
  type: "chart",
  chartType: "bar",
  title: "Quarterly revenue",
  data: {
    series: [{ name: "Revenue", values: [10, 20, 30, 40] }],
    xLabels: ["Q1", "Q2", "Q3", "Q4"],
    unit: "€M",
  },
  palette: "qualitative",
  showLegend: true,
  legendPosition: "bottom",
  showDataLabels: false,
};

const stackedBarChart: ChartBlock = {
  id: "22222222-2222-2222-2222-222222222222",
  type: "chart",
  chartType: "stacked-bar",
  title: "OPEX breakdown",
  takeaway: "Carbon cost grows fastest.",
  data: {
    series: [
      { name: "Fuel", values: [42, 44, 46] },
      { name: "Carbon", values: [3, 7, 16] },
      { name: "Maintenance", values: [8, 8, 8] },
    ],
    xLabels: ["2026", "2028", "2030"],
    unit: "€M",
  },
  axes: { yTitle: "Annual OPEX" },
  palette: "qualitative",
  showLegend: true,
  legendPosition: "bottom",
  showDataLabels: false,
};

const validPieChart: ChartBlock = {
  id: "33333333-3333-3333-3333-333333333333",
  type: "chart",
  chartType: "pie",
  title: "Revenue by segment",
  data: {
    series: [{ name: "Share", values: [40, 30, 20, 10] }],
    xLabels: ["Industrial", "Energy", "Mobility", "Other"],
  },
  palette: "qualitative",
  showLegend: true,
  legendPosition: "bottom",
  showDataLabels: true,
};

const testBrandMin = {
  schemaVersion: "1.0.0",
  lastUpdated: "2026-05-21",
  identity: { name: "Test" },
  logo: { primary: { svg: "logo.svg", minWidthPx: 80, intrinsicAspect: 3.2 } },
  spacing: { unit: 4, scale: [0, 1, 2, 3, 4] },
  typography: {
    fonts: {
      heading: { family: "Inter", source: "system" as const, weights: [600] },
      body: { family: "Inter", source: "system" as const, weights: [400] },
      mono: { family: "Mono", source: "system" as const, weights: [400] },
    },
    scale: { body: 11, bodyLg: 13, caption: 9, h1: 32 },
    lineHeight: { tight: 1.15, normal: 1.5 },
  },
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
      surfaceBackground: "#FFFFFF",
      textPrimary: "#1E293B",
      headingPrimary: "#0A1A2F",
      border: "#E2E8F0",
      link: "brand.primary",
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

describe("ChartBlockSchema — valid fixtures", () => {
  it("accepts a minimal bar chart", () => {
    expect(ChartBlockSchema.safeParse(minimalBarChart).success).toBe(true);
  });

  it("accepts a stacked bar chart with axes", () => {
    expect(ChartBlockSchema.safeParse(stackedBarChart).success).toBe(true);
  });

  it("accepts a pie chart with one series", () => {
    expect(ChartBlockSchema.safeParse(validPieChart).success).toBe(true);
  });
});

describe("ChartBlockSchema — cross-field validation", () => {
  it("rejects a pie chart with multiple series", () => {
    const bad: ChartBlock = {
      ...validPieChart,
      data: {
        ...validPieChart.data,
        series: [
          { name: "A", values: [1, 2] },
          { name: "B", values: [3, 4] },
        ],
      },
    };
    const result = ChartBlockSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues.map((i) => i.message).join(" ");
      expect(msg).toMatch(/exactly one series/);
    }
  });

  it("rejects a scatter chart with odd-length values", () => {
    const bad: ChartBlock = {
      ...minimalBarChart,
      chartType: "scatter",
      data: {
        series: [{ name: "Points", values: [1, 2, 3] }],
      },
    };
    expect(ChartBlockSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a bar chart missing xLabels", () => {
    const bad = {
      ...minimalBarChart,
      data: { series: minimalBarChart.data.series },
    };
    expect(ChartBlockSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a takeaway longer than 200 chars", () => {
    const bad = { ...minimalBarChart, takeaway: "x".repeat(201) };
    expect(ChartBlockSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown chart types", () => {
    const bad = { ...minimalBarChart, chartType: "treemap" as "bar" };
    expect(ChartBlockSchema.safeParse(bad).success).toBe(false);
  });
});

describe("Chart option builder (getEChartsOption)", () => {
  it("produces an ECharts option object for a bar chart", () => {
    const opt = getEChartsOption(minimalBarChart, testBrandMin);
    expect(opt.series).toBeDefined();
    expect(Array.isArray(opt.series)).toBe(true);
  });

  it("uses the brand chart palette (not hard-coded colors)", () => {
    const opt = getEChartsOption(minimalBarChart, testBrandMin);
    expect(opt.color).toEqual(testBrandMin.colors.chartPalette.qualitative);
  });

  it("switches to sequential palette when block.palette = 'sequential'", () => {
    const seq: ChartBlock = { ...minimalBarChart, palette: "sequential" };
    const opt = getEChartsOption(seq, testBrandMin);
    expect(opt.color).toEqual(testBrandMin.colors.chartPalette.sequential);
  });

  it("produces a polar (pie) option for pie chartType", () => {
    const opt = getEChartsOption(validPieChart, testBrandMin);
    const series = opt.series as Array<{ type: string }>;
    expect(series[0]?.type).toBe("pie");
  });

  it("hides legend when showLegend = false", () => {
    const noLegend: ChartBlock = { ...minimalBarChart, showLegend: false };
    const opt = getEChartsOption(noLegend, testBrandMin);
    expect((opt.legend as { show?: boolean }).show).toBe(false);
  });

  it("is deterministic for identical inputs", () => {
    const first = JSON.stringify(getEChartsOption(minimalBarChart, testBrandMin));
    const second = JSON.stringify(getEChartsOption(minimalBarChart, testBrandMin));
    expect(first).toBe(second);
  });
});

describe("Chart mapping (DocModel <-> ProseMirror)", () => {
  it("round-trips a minimal bar chart losslessly", () => {
    const pm = chartBlockToProseMirror(minimalBarChart) as {
      attrs: { blockId: string; payload: string };
    };
    expect(proseMirrorToChartBlock(pm)).toEqual(minimalBarChart);
  });

  it("round-trips a fully-populated stacked-bar chart losslessly", () => {
    const pm = chartBlockToProseMirror(stackedBarChart) as {
      attrs: { blockId: string; payload: string };
    };
    expect(proseMirrorToChartBlock(pm)).toEqual(stackedBarChart);
  });

  it("round-trips a pie chart losslessly", () => {
    const pm = chartBlockToProseMirror(validPieChart) as {
      attrs: { blockId: string; payload: string };
    };
    expect(proseMirrorToChartBlock(pm)).toEqual(validPieChart);
  });
});

describe("Chart TipTap node", () => {
  it("registers an `insertChart` command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, ChartTipTapNode],
    });
    editor.commands.insertChart({ title: "Test chart" });
    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain('"type":"chart"');
    expect(json).toContain("Test chart");
    editor.destroy();
  });
});

describe("Chart helpers", () => {
  it("hasCategoryAxis returns false for pie/donut", () => {
    expect(hasCategoryAxis("pie")).toBe(false);
    expect(hasCategoryAxis("donut")).toBe(false);
    expect(hasCategoryAxis("bar")).toBe(true);
  });

  it("defaultYZeroBased follows chart-type conventions", () => {
    expect(defaultYZeroBased("bar")).toBe(true);
    expect(defaultYZeroBased("stacked-bar")).toBe(true);
    expect(defaultYZeroBased("line")).toBe(false);
    expect(defaultYZeroBased("pie")).toBe(false);
  });
});

describe("ChartDataPanel — Excel paste", () => {
  it("applies TSV paste into chart data via the side panel grid", () => {
    const updates: ChartBlock[] = [];
    render(
      createElement(ChartDataPanel, {
        block: minimalBarChart,
        onUpdate: (next) => updates.push(next),
        onClose: () => undefined,
      }),
    );

    const grid = screen.getByRole("table").closest("div");
    expect(grid).toBeTruthy();

    fireEvent.paste(grid!, {
      clipboardData: {
        getData: () =>
          "Label\tSeries A\tSeries B\nQ1\t10\t1\nQ2\t20\t2\nQ3\t30\t3",
      },
    });

    expect(updates.length).toBeGreaterThan(0);
    const last = updates[updates.length - 1];
    expect(last?.data.xLabels).toEqual(["Q1", "Q2", "Q3"]);
    expect(last?.data.series).toHaveLength(2);
    expect(last?.data.series[0]?.values).toEqual([10, 20, 30]);
  });
});

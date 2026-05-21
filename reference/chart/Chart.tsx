/**
 * Reference block #5 — Chart renderer.
 *
 * Two render paths:
 *  - **Browser path** — used in the editor and the HTML deliverable. Mounts
 *    ECharts directly into a DOM element.
 *  - **SSR path** — used by the PDF export pipeline. Pre-renders the chart
 *    to a static SVG string via ECharts's headless API, then embeds the SVG
 *    inline. No JavaScript runs in the PDF render.
 *
 * The component below handles the browser path. The SSR path lives in
 * `src/export/pre-render-charts.ts` and reuses `getEChartsOption()` from
 * this file — the option object is the contract between the two paths.
 *
 * Production path: src/renderer/blocks/Chart.tsx
 */

import React, { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";
import { useBrandTokens, resolveBrandToken, resolveChartPalette } from "../primitives/block-primitives";
import { Caption } from "../primitives/block-primitives";
import {
  type ChartBlock,
  defaultYZeroBased,
  hasCategoryAxis,
} from "./schema";

export interface ChartProps {
  block: ChartBlock;
  /** When true, the chart renders into an SVG (used by PDF export). Default canvas. */
  renderer?: "canvas" | "svg";
}

export const Chart: React.FC<ChartProps> = ({ block, renderer = "canvas" }) => {
  const brand = useBrandTokens();
  const option = useMemo(() => getEChartsOption(block, brand), [block, brand]);
  const chartElRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    if (!chartElRef.current) return;

    const chart = echarts.init(chartElRef.current, undefined, { renderer });
    chartRef.current = chart;
    chart.setOption(option, true);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartElRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      if (chartRef.current === chart) {
        chartRef.current = null;
      }
    };
  }, [option, renderer]);

  return (
    <figure
      data-block-id={block.id}
      data-block-type="chart"
      data-chart-type={block.chartType}
      style={{
        margin: 0,
        padding: brand.spacing.unit * 2,
        background: resolveBrandToken<string>(brand, "colors.semantic.pageBackground"),
      }}
    >
      <div
        style={{
          fontFamily: brand.typography.fonts.heading.family,
          fontSize: brand.typography.scale.bodyLg,
          fontWeight: 600,
          color: resolveBrandToken<string>(brand, "colors.semantic.headingPrimary"),
          marginBottom: brand.spacing.unit * 2,
        }}
      >
        {block.title}
      </div>

      <div
        ref={chartElRef}
        role="img"
        aria-label={block.title}
        style={{ height: 360, width: "100%" }}
      />

      {block.takeaway && (
        <Caption align="left">
          <strong>So what:</strong> {block.takeaway}
        </Caption>
      )}
    </figure>
  );
};

// ── The option-builder is exported separately so the SSR PDF pipeline ───────
// ── can reuse it without mounting React. This is the contract that keeps ────
// ── the browser path and the SSR path producing identical visuals. ──────────

interface BrandLike {
  spacing: { unit: number };
  typography: {
    fonts: { body: { family: string }; heading: { family: string } };
    scale: Record<string, number>;
  };
  colors: {
    chartPalette: { qualitative: string[]; sequential: string[] };
    [k: string]: unknown;
  };
}

export function getEChartsOption(block: ChartBlock, brand: BrandLike): EChartsOption {
  const palette = resolveChartPalette(brand as never, block.palette);
  const baseTextStyle = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: 11,
    color: resolveBrandToken<string>(brand as never, "colors.semantic.textPrimary"),
  };
  const axisLineStyle = {
    color: resolveBrandToken<string>(brand as never, "colors.semantic.border"),
  };
  const splitLineStyle = {
    color: resolveBrandToken<string>(brand as never, "colors.semantic.border"),
    type: "dashed" as const,
  };

  const yZero = block.axes?.yZeroBased ?? defaultYZeroBased(block.chartType);
  const ySuffix = block.axes?.ySuffix ?? block.data.unit ?? "";

  // Pie / donut share an option shape — handle them first.
  if (block.chartType === "pie" || block.chartType === "donut") {
    const slices = (block.data.xLabels ?? []).map((label, i) => ({
      name: label,
      value: block.data.series[0]?.values[i] ?? 0,
      itemStyle: { color: palette[i % palette.length] },
    }));
    return {
      color: palette,
      textStyle: baseTextStyle,
      legend: block.showLegend ? { bottom: 0, textStyle: baseTextStyle } : { show: false },
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: block.chartType === "donut" ? ["50%", "75%"] : "75%",
          center: ["50%", "45%"],
          label: {
            show: block.showDataLabels,
            formatter: `{b}: {c}${ySuffix}`,
            ...baseTextStyle,
          },
          data: slices,
        },
      ],
    };
  }

  // For all other chart types, x-axis is required.
  const xAxisData = block.data.xLabels ?? [];

  // Series mapping varies by chart type.
  const series = block.data.series.map((s, i) => {
    const color = s.paletteIndex !== undefined
      ? palette[s.paletteIndex % palette.length]
      : palette[i % palette.length];

    const common = {
      name: s.name,
      itemStyle: { color },
      label: {
        show: block.showDataLabels,
        formatter: (p: { value: number }) => `${p.value}${ySuffix}`,
        ...baseTextStyle,
      },
    };

    switch (block.chartType) {
      case "bar":
        return { ...common, type: "bar" as const, data: s.values };
      case "stacked-bar":
        return { ...common, type: "bar" as const, stack: "total", data: s.values };
      case "line":
        return { ...common, type: "line" as const, data: s.values, smooth: false };
      case "area":
        return { ...common, type: "line" as const, data: s.values, areaStyle: {} };
      case "scatter":
        return {
          ...common,
          type: "scatter" as const,
          data: pairs(s.values),
        };
      case "waterfall":
        // ECharts has no built-in waterfall — implement via stacked bars with a
        // transparent "placeholder" series. For brevity here we render as bar;
        // a real implementation computes cumulatives. See note in
        // BLOCK_IMPLEMENTATION_GUIDE.md §3.chart.
        return { ...common, type: "bar" as const, data: s.values };
      case "mekko":
        // Mekko (Marimekko) — variable-width stacked bars. ECharts custom series.
        // Out of scope for the reference; a real impl uses `type: 'custom'`.
        // See BLOCK_IMPLEMENTATION_GUIDE.md §3.chart.
        return { ...common, type: "bar" as const, stack: "total", data: s.values };
      default:
        return { ...common, type: "bar" as const, data: s.values };
    }
  });

  const isCategoryX = hasCategoryAxis(block.chartType) && block.chartType !== "scatter";

  return {
    color: palette,
    textStyle: baseTextStyle,
    grid: { top: 30, right: 24, bottom: block.showLegend ? 60 : 30, left: 56 },
    legend: block.showLegend
      ? { bottom: 0, textStyle: baseTextStyle }
      : { show: false },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: isCategoryX ? "category" : "value",
      data: isCategoryX ? xAxisData : undefined,
      name: block.axes?.xTitle,
      nameLocation: "middle",
      nameGap: 28,
      axisLine: { lineStyle: axisLineStyle },
      axisLabel: baseTextStyle,
    },
    yAxis: {
      type: "value",
      name: block.axes?.yTitle,
      nameLocation: "middle",
      nameGap: 40,
      scale: !yZero,
      axisLine: { lineStyle: axisLineStyle },
      splitLine: { lineStyle: splitLineStyle },
      axisLabel: {
        ...baseTextStyle,
        formatter: ySuffix ? (v: number) => `${v}${ySuffix}` : undefined,
      },
    },
    series,
  };
}

/** Pack a flat [x, y, x, y, ...] array into [[x, y], [x, y], ...] for scatter. */
function pairs(values: number[]): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < values.length; i += 2) {
    out.push([values[i] ?? 0, values[i + 1] ?? 0]);
  }
  return out;
}

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

import { useEffect, useMemo, useRef, type FC } from "react";
import * as echarts from "echarts";
import type { ECharts, EChartsOption } from "echarts";
import { Caption } from "../../block-primitives";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import {
  resolveBrandToken,
  resolveChartPalette,
} from "../../brand-tokens/resolve";
import type { BrandTokens } from "../../schema/brand";
import {
  type ChartBlock,
  defaultYZeroBased,
  hasCategoryAxis,
} from "../../schema/blocks/chart";

export interface ChartProps {
  block: ChartBlock;
  /** When true, the chart renders into an SVG (used by PDF export). Default canvas. */
  renderer?: "canvas" | "svg";
}

export const Chart: FC<ChartProps> = ({ block, renderer = "canvas" }) => {
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
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="chart"
      data-chart-type={block.chartType}
      style={{
        margin: 0,
        padding: brand.spacing.unit * 2,
        background: resolveBrandToken(
          brand,
          "colors.semantic.surfaceBackground",
        ),
      }}
    >
      <div
        style={{
          fontFamily: brand.typography.fonts.heading.family,
          fontSize: brand.typography.scale.bodyLg,
          fontWeight: 600,
          color: resolveBrandToken(brand, "colors.semantic.headingPrimary"),
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

export function getEChartsOption(
  block: ChartBlock,
  brand: BrandTokens,
): EChartsOption {
  const palette = resolveChartPalette(brand, block.palette);
  const baseTextStyle = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: 11,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
  };
  const axisLineStyle = {
    color: resolveBrandToken(brand, "colors.semantic.border"),
  };
  const splitLineStyle = {
    color: resolveBrandToken(brand, "colors.semantic.border"),
    type: "dashed" as const,
  };

  const yZero = block.axes?.yZeroBased ?? defaultYZeroBased(block.chartType);
  const ySuffix = block.axes?.ySuffix ?? block.data.unit ?? "";
  const fallbackColor = resolveBrandToken(brand, "colors.semantic.textPrimary");

  const paletteColor = (index: number): string =>
    palette[index % palette.length] ?? palette[0] ?? fallbackColor;

  // Pie / donut share an option shape — handle them first.
  if (block.chartType === "pie" || block.chartType === "donut") {
    const slices = (block.data.xLabels ?? []).map((label, i) => ({
      name: label,
      value: block.data.series[0]?.values[i] ?? 0,
      itemStyle: { color: paletteColor(i) },
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
    const color =
      s.paletteIndex !== undefined
        ? paletteColor(s.paletteIndex)
        : paletteColor(i);

    const common = {
      name: s.name,
      itemStyle: { color },
      label: {
        show: block.showDataLabels,
        formatter: (p: { value?: string | number }) =>
          `${String(p.value ?? "")}${ySuffix}`,
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
      type: isCategoryX ? ("category" as const) : ("value" as const),
      ...(isCategoryX ? { data: xAxisData } : {}),
      ...(block.axes?.xTitle ? { name: block.axes.xTitle } : {}),
      nameLocation: "middle",
      nameGap: 28,
      axisLine: { lineStyle: axisLineStyle },
      axisLabel: baseTextStyle,
    },
    yAxis: {
      type: "value",
      ...(block.axes?.yTitle ? { name: block.axes.yTitle } : {}),
      nameLocation: "middle",
      nameGap: 40,
      scale: !yZero,
      axisLine: { lineStyle: axisLineStyle },
      splitLine: { lineStyle: splitLineStyle },
      axisLabel: {
        ...baseTextStyle,
        ...(ySuffix
          ? { formatter: (v: number) => `${v}${ySuffix}` }
          : {}),
      },
    },
    series,
  } as EChartsOption;
}

/** Pack a flat [x, y, x, y, ...] array into [[x, y], [x, y], ...] for scatter. */
function pairs(values: number[]): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < values.length; i += 2) {
    out.push([values[i] ?? 0, values[i + 1] ?? 0]);
  }
  return out;
}

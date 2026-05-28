/**
 * src/blocks/chart/index.tsx — self-contained registry manifest for the
 * Chart block.
 *
 * Folds in the legacy ChartNode.tsx (editor) and Chart.tsx (renderer)
 * into a single co-located file. ChartDataPanel.tsx is also co-located here
 * (see ./ChartDataPanel). Default-exports the BlockRegistryRecord consumed
 * by src/blocks/runtime-registry.ts.
 *
 * The getEChartsOption() SSR helper is exported so the PDF export pipeline
 * (src/export/pdf.ts, src/export/render-static-html.ts) can reuse it.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useEffect, useMemo, useRef, type FC, type ReactNode, type ComponentType } from "react";
// ECharts is loaded lazily (see the Chart effect below) so that importing the
// block registry — which most of the test suite and the app startup do — does
// NOT pull multi-MB of ECharts into memory. Eagerly importing it here caused
// the heap to accumulate per test file until the worker OOM-crashed.
import type { ECharts, EChartsOption } from "echarts";
import { Caption } from "../../block-primitives";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import {
  resolveBrandToken,
  resolveChartPalette,
} from "../../brand-tokens/resolve";
import type { BrandTokens } from "../../schema/brand";
import { defineBlock } from "../defineBlock";
import { ChartDataPanel } from "./ChartDataPanel";
import type { ProseMirrorNode } from "../../editor/mapping";
import type { ZodType } from "zod";
import {
  ChartBlockDataSchema,
  defaultYZeroBased,
  hasCategoryAxis,
  type ChartAxes,
  type ChartBlock,
  type ChartData,
  type ChartType,
} from "./schema";

// ── Re-exports for backward compatibility ─────────────────────────────────
export {
  ChartTypeSchema,
  ChartSeriesSchema,
  ChartDataSchema,
  ChartAxesSchema,
  ChartBlockDataSchema,
  ChartBlockSchema,
  hasCategoryAxis,
  defaultYZeroBased,
  type ChartType,
  type ChartSeries,
  type ChartData,
  type ChartAxes,
  type ChartBlock,
} from "./schema";

// ── TipTap commands augmentation ─────────────────────────────────────────
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    chart: {
      /** Insert a new chart with sensible defaults. */
      insertChart: (attrs?: Partial<ChartAttrs>) => ReturnType;
    };
  }
}

interface ChartAttrs {
  blockId: string;
  chartType: ChartType;
  title: string;
  takeaway: string;
  data: ChartData;
  axes?: ChartAxes;
  palette: "qualitative" | "sequential";
  showLegend: boolean;
  legendPosition: "bottom" | "right" | "top";
  showDataLabels: boolean;
  note: string;
}

// ── TipTap node ───────────────────────────────────────────────────────────
export const ChartTipTapNode = Node.create({
  name: "chart",
  group: "block",
  content: "",
  atom: true,
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      payload: {
        default: "{}",
        parseHTML: (el) => el.getAttribute("data-payload") ?? "{}",
        renderHTML: (attrs: { payload: string }) => ({
          "data-payload": attrs.payload,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-block-type="chart"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { "data-block-type": "chart" })];
  },

  addCommands() {
    return {
      insertChart:
        (attrs = {}) =>
        ({ commands }) => {
          const blockId = crypto.randomUUID();
          const payload: ChartAttrs = {
            blockId,
            chartType: attrs.chartType ?? "bar",
            title: attrs.title ?? "New chart",
            takeaway: attrs.takeaway ?? "",
            data: attrs.data ?? {
              series: [{ name: "Series 1", values: [1, 2, 3, 4, 5] }],
              xLabels: ["A", "B", "C", "D", "E"],
            },
            palette: attrs.palette ?? "qualitative",
            showLegend: attrs.showLegend ?? true,
            legendPosition: attrs.legendPosition ?? "bottom",
            showDataLabels: attrs.showDataLabels ?? false,
            note: attrs.note ?? "",
          };
          if (attrs.axes) {
            payload.axes = attrs.axes;
          }
          return commands.insertContent({
            type: this.name,
            attrs: {
              blockId,
              payload: JSON.stringify(payload),
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});

// ── NodeView (editor) ─────────────────────────────────────────────────────
const ChartNodeView: FC<NodeViewProps> = ({ node, selected }) => {
  let block: ChartBlock | null = null;
  try {
    const parsed = JSON.parse(String(node.attrs.payload)) as ChartAttrs;
    block = {
      id: String(node.attrs.blockId),
      type: "chart",
      chartType: parsed.chartType,
      title: parsed.title,
      takeaway: parsed.takeaway || undefined,
      data: parsed.data,
      palette: parsed.palette,
      showLegend: parsed.showLegend,
      legendPosition: parsed.legendPosition,
      showDataLabels: parsed.showDataLabels,
      note: parsed.note || undefined,
      ...(parsed.axes ? { axes: parsed.axes } : {}),
    };
  } catch {
    // Malformed payload — render an error placeholder.
  }

  return (
    <NodeViewWrapper
      data-block-id={String(node.attrs.blockId)}
      contentEditable={false}
      style={{
        outline: selected ? "2px solid var(--brand-primary, #0B3D91)" : "none",
        outlineOffset: 4,
        cursor: "pointer",
      }}
    >
      {block ? <Chart block={block} /> : <ChartErrorPlaceholder />}
    </NodeViewWrapper>
  );
};

const ChartErrorPlaceholder: FC = () => (
  <div
    role="alert"
    style={{
      padding: 16,
      border: "1px dashed #B91C1C",
      borderRadius: 4,
      background: "#FEF2F2",
      color: "#B91C1C",
      fontSize: 12,
    }}
  >
    Chart payload could not be parsed. Open the side panel to repair.
  </div>
);

// ── PM helpers ────────────────────────────────────────────────────────────
export function chartBlockToProseMirror(block: ChartBlock): unknown {
  const payload: ChartAttrs = {
    blockId: block.id,
    chartType: block.chartType,
    title: block.title,
    takeaway: block.takeaway ?? "",
    data: block.data,
    palette: block.palette,
    showLegend: block.showLegend,
    legendPosition: block.legendPosition,
    showDataLabels: block.showDataLabels,
    note: block.note ?? "",
  };
  if (block.axes) {
    payload.axes = block.axes;
  }
  return {
    type: "chart",
    attrs: {
      blockId: block.id,
      payload: JSON.stringify(payload),
    },
  };
}

export function proseMirrorToChartBlock(node: {
  attrs: { blockId: string; payload: string };
}): ChartBlock {
  const parsed = JSON.parse(node.attrs.payload) as ChartAttrs;
  const block: ChartBlock = {
    id: node.attrs.blockId,
    type: "chart",
    chartType: parsed.chartType,
    title: parsed.title,
    data: parsed.data,
    palette: parsed.palette,
    showLegend: parsed.showLegend,
    legendPosition: parsed.legendPosition,
    showDataLabels: parsed.showDataLabels,
  };
  if (parsed.takeaway) {
    block.takeaway = parsed.takeaway;
  }
  if (parsed.axes) {
    block.axes = parsed.axes;
  }
  if (parsed.note) {
    block.note = parsed.note;
  }
  return block;
}

// ── ECharts option builder ────────────────────────────────────────────────
// Exported so the SSR PDF pipeline (src/export/pdf.ts,
// src/export/render-static-html.ts) can reuse it without mounting React.

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

  if (block.chartType === "pie" || block.chartType === "donut") {
    const slices = (block.data.xLabels ?? []).map((label, i) => ({
      name: label,
      value: block.data.series[0]?.values[i] ?? 0,
      itemStyle: { color: paletteColor(i) },
    }));
    return {
      color: palette,
      textStyle: baseTextStyle,
      legend: legendOption(block, baseTextStyle),
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

  const xAxisData = block.data.xLabels ?? [];

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
        return { ...common, type: "bar" as const, data: s.values };
      case "mekko":
        return { ...common, type: "bar" as const, stack: "total", data: s.values };
      default:
        return { ...common, type: "bar" as const, data: s.values };
    }
  });

  const isCategoryX = hasCategoryAxis(block.chartType) && block.chartType !== "scatter";

  return {
    color: palette,
    textStyle: baseTextStyle,
    grid: gridForLegend(block),
    legend: legendOption(block, baseTextStyle),
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

function legendOption(
  block: ChartBlock,
  textStyle: { fontFamily: string; fontSize: number; color: string },
) {
  if (!block.showLegend) {
    return { show: false };
  }
  switch (block.legendPosition) {
    case "top":
      return { top: 0, textStyle };
    case "right":
      return { right: 0, orient: "vertical" as const, textStyle };
    case "bottom":
      return { bottom: 0, textStyle };
  }
}

function gridForLegend(block: ChartBlock) {
  if (!block.showLegend) {
    return { top: 30, right: 24, bottom: 30, left: 56 };
  }
  switch (block.legendPosition) {
    case "top":
      return { top: 60, right: 24, bottom: 30, left: 56 };
    case "right":
      return { top: 30, right: 120, bottom: 30, left: 56 };
    case "bottom":
      return { top: 30, right: 24, bottom: 60, left: 56 };
  }
}

/** Pack a flat [x, y, x, y, ...] array into [[x, y], [x, y], ...] for scatter. */
function pairs(values: number[]): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < values.length; i += 2) {
    out.push([values[i] ?? 0, values[i + 1] ?? 0]);
  }
  return out;
}

// ── Renderer ──────────────────────────────────────────────────────────────
export interface ChartProps {
  block: ChartBlock;
  /** When true, the chart renders into an SVG (used by PDF export). Default canvas. */
  renderer?: "canvas" | "svg";
  /** Pre-rendered SVG from the PDF export pipeline (SSR path). */
  staticSvg?: string;
}

export const Chart: FC<ChartProps> = ({
  block,
  renderer = "canvas",
  staticSvg,
}) => {
  const brand = useBrandTokens();
  const option = useMemo(() => getEChartsOption(block, brand), [block, brand]);
  const chartElRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    const el = chartElRef.current;
    if (staticSvg || !el) return;

    let cancelled = false;
    let chart: ECharts | null = null;
    let resizeObserver: ResizeObserver | null = null;

    // Lazy-load ECharts only when a live chart actually renders.
    void import("echarts").then((echarts) => {
      if (cancelled || chartElRef.current === null) return;
      chart = echarts.init(el, undefined, { renderer });
      chartRef.current = chart;
      chart.setOption(option, true);
      resizeObserver = new ResizeObserver(() => chart?.resize());
      resizeObserver.observe(el);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      chart?.dispose();
      if (chartRef.current === chart) {
        chartRef.current = null;
      }
    };
  }, [option, renderer, staticSvg]);

  const figureShell = (title: ReactNode, body: ReactNode) => (
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
        {title}
      </div>
      {body}
      {block.takeaway ? (
        <Caption align="left">
          <strong>So what:</strong> {block.takeaway}
        </Caption>
      ) : null}
    </figure>
  );

  if (staticSvg) {
    return figureShell(
      block.title,
      <img
        role="img"
        aria-label={block.title}
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(staticSvg)}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      />,
    );
  }

  return figureShell(
    block.title,
    <div
      ref={chartElRef}
      role="img"
      aria-label={block.title}
      style={{ height: 360, width: "100%" }}
    />,
  );
};

// ── Registry manifest ─────────────────────────────────────────────────────
const chartBlock = defineBlock<ChartBlock>({
  schemaName: "chart",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: ChartBlockDataSchema as ZodType<ChartBlock>,
  allowedAttrs: ["chartType", "title", "takeaway", "data", "axes", "palette", "showLegend", "showDataLabels", "note"] as const,
  paletteLabel: "Chart",
  tiptapNode: ChartTipTapNode,
  renderer: Chart as ComponentType<{ block: ChartBlock }>,
  toPm: (block) => chartBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToChartBlock(
      node as unknown as Parameters<typeof proseMirrorToChartBlock>[0],
    ),
  panel: ChartDataPanel,
});

export default chartBlock;

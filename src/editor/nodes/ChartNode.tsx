/**
 * Reference block #5 — Chart TipTap node + mapping helpers.
 *
 * Charts are an **atom node** in the editor — TipTap treats them as a single
 * unit, with no editable rich text inside. Editing happens through the side
 * panel (see ChartDataPanel.tsx), not inline.
 *
 * Production path: src/editor/nodes/ChartNode.tsx
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import type {
  ChartAxes,
  ChartBlock,
  ChartData,
  ChartType,
} from "../../schema/blocks/chart";
import { Chart } from "../../renderer/blocks/Chart";

// ── Commands declared on the editor ─────────────────────────────────────────

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

// ── TipTap node definition ─────────────────────────────────────────────────

export const ChartTipTapNode = Node.create({
  name: "chart",
  group: "block",
  // Atom node — TipTap doesn't recurse into children.
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
      // The chart's whole data payload lives in a single JSON-encoded attribute.
      // ProseMirror doesn't store deep objects in attrs natively — JSON is the
      // standard workaround for atom nodes with rich payloads.
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

// ── The in-editor view ──────────────────────────────────────────────────────

/**
 * Inside the editor, a chart node renders the actual <Chart> preview at half
 * height + a click target. Selecting the chart opens the side panel
 * (ChartDataPanel) for editing — see editor/panels/ChartDataPanel.tsx.
 *
 * The wrapper is `contentEditable=false` so the user can't type inside the
 * chart — all interaction goes through the side panel.
 */
const ChartNodeView: FC<NodeViewProps> = ({ node, selected }) => {
  // Parse the JSON payload back into a ChartBlock for the preview render.
  // If the payload is malformed, render a placeholder with a clear error.
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
    // Malformed payload — render an error placeholder. This SHOULD NEVER
    // happen because the mapping function below produces valid JSON, but
    // defense in depth.
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

// ── DocModel ⇄ ProseMirror mapping ──────────────────────────────────────────

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

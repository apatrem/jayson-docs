/**
 * Reference block #5 — Chart registry manifest (runtime).
 *
 * Demonstrates the `defineBlock({...})` pattern for an **atom-node block**:
 * one with a JSON-encoded payload attr (instead of inline ProseMirror content)
 * and a dedicated side-panel editor (ADR-0007 restriction: imperative TipTap,
 * not declarative; chart's atom-node + side-panel exceeds the Authored block
 * capability set).
 *
 * Key difference from callout's index.ts:
 * - `toPm` serializes the whole ChartBlock into a single JSON `payload` attr.
 * - `fromPm` deserialises that payload back into a ChartBlock.
 * - The TipTap node is `content: ""` / `atom: true` (no nested ProseMirror doc).
 *
 * Use this pattern for: kpi-cards, risk-matrix, team, roadmap, timeline, diagram.
 * Use callout's index.ts pattern for blocks with inline rich-text (prose, heading,
 * bullet-list, numbered-list, callout itself).
 *
 * Production path: src/blocks/chart/index.ts
 */

import { ChartBlockSchema } from "./schema";
import type { ChartBlock } from "./schema";
import {
  ChartTipTapNode,
  chartBlockToProseMirror,
  proseMirrorToChartBlock,
} from "./ChartNode";
import { Chart } from "./Chart";
import { defineBlock } from "../../src/blocks/defineBlock";
import type { ProseMirrorNode } from "../../src/editor/mapping";

/**
 * Full block manifest — consumed by runtime-registry.ts.
 *
 * Note on casts:
 * - `chartBlockToProseMirror` returns `unknown`; cast to `ProseMirrorNode` is
 *   safe because the returned `{ type, attrs }` shape matches the interface.
 * - `proseMirrorToChartBlock` expects `{ attrs: { blockId, payload } }`; cast
 *   from `ProseMirrorNode` is safe when the node type is "chart".
 */
const chartBlock = defineBlock<ChartBlock>({
  schemaName: "chart",
  schema: ChartBlockSchema,
  allowedAttrs: [
    "chartType", "title", "takeaway",
    "data", "axes", "palette", "showLegend", "showDataLabels", "note",
  ] as const,
  paletteLabel: "Chart",
  tiptapNode: ChartTipTapNode,
  renderer: Chart,
  toPm: (block) => chartBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToChartBlock(
      node as { attrs: { blockId: string; payload: string } },
    ),
});

export default chartBlock;

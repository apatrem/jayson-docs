/**
 * src/blocks/chart/index.ts — runtime manifest for the Chart block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { ChartBlock } from "./schema";
import { ChartBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  ChartTipTapNode,
  chartBlockToProseMirror,
  proseMirrorToChartBlock,
} from "../../editor/nodes/ChartNode";
import { Chart } from "../../renderer/blocks/Chart";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const chartBlock = defineBlock<ChartBlock>({ 
  schemaName: "chart",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: ChartBlockSchema as ZodType<ChartBlock>,
  allowedAttrs: ["chartType", "title", "takeaway", "data", "axes", "palette", "showLegend", "showDataLabels", "note"] as const,
  paletteLabel: "Chart",
  tiptapNode: ChartTipTapNode,
  renderer: Chart,
  toPm: (block) => chartBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToChartBlock(node as unknown as Parameters<typeof proseMirrorToChartBlock>[0]),
});

export default chartBlock;

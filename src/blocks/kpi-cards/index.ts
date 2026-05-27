/**
 * src/blocks/kpi-cards/index.ts — runtime manifest for the KPI Cards block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { KpiCardsBlock } from "./schema";
import { KpiCardsBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  KpiCardsTipTapNode,
  kpiCardsBlockToProseMirror,
  proseMirrorToKpiCardsBlock,
} from "../../editor/nodes/KpiCardsNode";
import { KpiCards } from "../../renderer/blocks/KpiCards";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const kpiCardsBlock = defineBlock<KpiCardsBlock>({ 
  schemaName: "kpi-cards",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: KpiCardsBlockSchema as ZodType<KpiCardsBlock>,
  allowedAttrs: ["cards", "note"] as const,
  paletteLabel: "KPI Cards",
  tiptapNode: KpiCardsTipTapNode,
  renderer: KpiCards,
  toPm: (block) => kpiCardsBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToKpiCardsBlock(node as unknown as Parameters<typeof proseMirrorToKpiCardsBlock>[0]),
});

export default kpiCardsBlock;

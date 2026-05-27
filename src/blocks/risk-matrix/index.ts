/**
 * src/blocks/risk-matrix/index.ts — runtime manifest for the Risk Matrix block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { RiskMatrixBlock } from "./schema";
import { RiskMatrixBlockDataSchema } from "./schema";
import type { ZodType } from "zod";
import {
  RiskMatrixTipTapNode,
  riskMatrixBlockToProseMirror,
  proseMirrorToRiskMatrixBlock,
} from "../../editor/nodes/RiskMatrixNode";
import { RiskMatrix } from "../../renderer/blocks/RiskMatrix";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const riskMatrixBlock = defineBlock<RiskMatrixBlock>({ 
  schemaName: "risk-matrix",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: RiskMatrixBlockDataSchema as ZodType<RiskMatrixBlock>,
  allowedAttrs: ["gridSize", "xAxisLabel", "yAxisLabel", "risks", "note"] as const,
  paletteLabel: "Risk Matrix",
  tiptapNode: RiskMatrixTipTapNode,
  renderer: RiskMatrix,
  toPm: (block) => riskMatrixBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToRiskMatrixBlock(node as unknown as Parameters<typeof proseMirrorToRiskMatrixBlock>[0]),
});

export default riskMatrixBlock;

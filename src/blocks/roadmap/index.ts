/**
 * src/blocks/roadmap/index.ts — runtime manifest for the Roadmap block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { RoadmapBlock } from "./schema";
import { RoadmapBlockDataSchema } from "./schema";
import type { ZodType } from "zod";
import {
  RoadmapTipTapNode,
  roadmapBlockToProseMirror,
  proseMirrorToRoadmapBlock,
} from "../../editor/nodes/RoadmapNode";
import { Roadmap } from "../../renderer/blocks/Roadmap";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const roadmapBlock = defineBlock<RoadmapBlock>({ 
  schemaName: "roadmap",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: RoadmapBlockDataSchema as ZodType<RoadmapBlock>,
  allowedAttrs: ["timeUnit", "startDate", "endDate", "workstreams", "milestones", "note"] as const,
  paletteLabel: "Roadmap",
  tiptapNode: RoadmapTipTapNode,
  renderer: Roadmap,
  toPm: (block) => roadmapBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToRoadmapBlock(node as unknown as Parameters<typeof proseMirrorToRoadmapBlock>[0]),
});

export default roadmapBlock;

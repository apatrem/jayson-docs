/**
 * src/blocks/timeline/index.ts — runtime manifest for the Timeline block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { TimelineBlock } from "./schema";
import { TimelineBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  TimelineTipTapNode,
  timelineBlockToProseMirror,
  proseMirrorToTimelineBlock,
} from "../../editor/nodes/TimelineNode";
import { Timeline } from "../../renderer/blocks/Timeline";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const timelineBlock = defineBlock<TimelineBlock>({ 
  schemaName: "timeline",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: TimelineBlockSchema as ZodType<TimelineBlock>,
  allowedAttrs: ["phases", "orientation", "connector", "note"] as const,
  paletteLabel: "Timeline",
  tiptapNode: TimelineTipTapNode,
  renderer: Timeline,
  toPm: (block) => timelineBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToTimelineBlock(node as unknown as Parameters<typeof proseMirrorToTimelineBlock>[0]),
});

export default timelineBlock;

/**
 * src/blocks/heading/index.ts — runtime manifest for the Heading block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { HeadingBlock } from "./schema";
import { HeadingBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  HeadingTipTapNode,
  headingBlockToProseMirror,
  proseMirrorToHeadingBlock,
} from "../../editor/nodes/HeadingNode";
import { Heading } from "../../renderer/blocks/Heading";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const headingBlock = defineBlock<HeadingBlock>({ 
  schemaName: "heading",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: HeadingBlockSchema as ZodType<HeadingBlock>,
  allowedAttrs: ["level", "text", "numbered", "note"] as const,
  paletteLabel: "Heading",
  tiptapNode: HeadingTipTapNode,
  renderer: Heading,
  toPm: (block) => headingBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToHeadingBlock(node as unknown as Parameters<typeof proseMirrorToHeadingBlock>[0]),
});

export default headingBlock;

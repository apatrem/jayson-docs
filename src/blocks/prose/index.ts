/**
 * src/blocks/prose/index.ts — runtime manifest for the Prose block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { ProseBlock } from "./schema";
import { ProseBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  ProseTipTapNode,
  proseBlockToProseMirror,
  proseMirrorToProseBlock,
} from "../../editor/nodes/ProseNode";
import { Prose } from "../../renderer/blocks/Prose";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const proseBlock = defineBlock<ProseBlock>({ 
  schemaName: "prose",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: ProseBlockSchema as ZodType<ProseBlock>,
  allowedAttrs: ["content", "align", "note"] as const,
  paletteLabel: "Prose",
  tiptapNode: ProseTipTapNode,
  renderer: Prose,
  toPm: (block) => proseBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToProseBlock(node as unknown as Parameters<typeof proseMirrorToProseBlock>[0]),
});

export default proseBlock;

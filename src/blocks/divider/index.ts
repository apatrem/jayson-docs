/**
 * src/blocks/divider/index.ts — runtime manifest for the Divider block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { DividerBlock } from "./schema";
import { DividerBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  DividerTipTapNode,
  dividerBlockToProseMirror,
  proseMirrorToDividerBlock,
} from "../../editor/nodes/DividerNode";
import { Divider } from "../../renderer/blocks/Divider";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const dividerBlock = defineBlock<DividerBlock>({ 
  schemaName: "divider",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: DividerBlockSchema as ZodType<DividerBlock>,
  allowedAttrs: ["label", "subtitle", "numbering", "note"] as const,
  paletteLabel: "Divider",
  tiptapNode: DividerTipTapNode,
  renderer: Divider,
  toPm: (block) => dividerBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToDividerBlock(node as unknown as Parameters<typeof proseMirrorToDividerBlock>[0]),
});

export default dividerBlock;

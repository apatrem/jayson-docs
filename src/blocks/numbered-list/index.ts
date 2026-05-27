/**
 * src/blocks/numbered-list/index.ts — runtime manifest for the Numbered List block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { NumberedListBlock } from "./schema";
import { NumberedListBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  NumberedListTipTapNode,
  numberedListBlockToProseMirror,
  proseMirrorToNumberedListBlock,
} from "../../editor/nodes/NumberedListNode";
import { NumberedList } from "../../renderer/blocks/NumberedList";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const numberedListBlock = defineBlock<NumberedListBlock>({ 
  schemaName: "numbered-list",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: NumberedListBlockSchema as ZodType<NumberedListBlock>,
  allowedAttrs: ["items", "startAt", "note"] as const,
  paletteLabel: "Numbered List",
  tiptapNode: NumberedListTipTapNode,
  renderer: NumberedList,
  toPm: (block) => numberedListBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToNumberedListBlock(node as unknown as Parameters<typeof proseMirrorToNumberedListBlock>[0]),
});

export default numberedListBlock;

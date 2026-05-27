/**
 * src/blocks/bullet-list/index.ts — runtime manifest for the Bullet List block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { BulletListBlock } from "./schema";
import { BulletListBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  BulletListTipTapNode,
  bulletListBlockToProseMirror,
  proseMirrorToBulletListBlock,
} from "../../editor/nodes/BulletListNode";
import { BulletList } from "../../renderer/blocks/BulletList";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const bulletListBlock = defineBlock<BulletListBlock>({ 
  schemaName: "bullet-list",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: BulletListBlockSchema as ZodType<BulletListBlock>,
  allowedAttrs: ["items", "note"] as const,
  paletteLabel: "Bullet List",
  tiptapNode: BulletListTipTapNode,
  renderer: BulletList,
  toPm: (block) => bulletListBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToBulletListBlock(node as unknown as Parameters<typeof proseMirrorToBulletListBlock>[0]),
});

export default bulletListBlock;

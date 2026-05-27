/**
 * src/blocks/callout/index.ts — runtime manifest for the Callout block.
 *
 * Legacy-wrapper approach (T-141): imports the existing editor node and renderer
 * and wraps them in a defineBlock({...}) manifest. The per-block migration task
 * (T-14x) will fold the legacy files into this folder.
 *
 * Default-exports the BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

import type { CalloutBlock } from "./schema";
import { CalloutBlockSchema } from "./schema";
import type { ZodType } from "zod";
import {
  CalloutTipTapNode,
  calloutBlockToProseMirror,
  proseMirrorToCalloutBlock,
} from "../../editor/nodes/CalloutNode";
import { Callout } from "../../renderer/blocks/Callout";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

const calloutBlock = defineBlock<CalloutBlock>({ 
  schemaName: "callout",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: CalloutBlockSchema as ZodType<CalloutBlock>,
  allowedAttrs: ["variant", "title", "body", "attribution", "note"] as const,
  paletteLabel: "Callout",
  tiptapNode: CalloutTipTapNode,
  renderer: Callout,
  toPm: (block) => calloutBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToCalloutBlock(node as unknown as Parameters<typeof proseMirrorToCalloutBlock>[0]),
});

export default calloutBlock;

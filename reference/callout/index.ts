/**
 * Reference block #7 — Callout registry manifest (runtime).
 *
 * NEW SHAPE (ADR-0008, T-138): this is the canonical `defineBlock({...})`
 * pattern. Two files per block:
 *   - schema.ts  — pure, no React/TipTap. Imports only from zod + sibling
 *                   pure modules. Exported `schemaEntry` feeds schema-registry.
 *   - index.ts   — runtime (this file). Imports schema + TipTap node + renderer.
 *                   Default-exports the full BlockRegistryRecord for runtime-registry.
 *
 * The legacy files (Callout.tsx, CalloutNode.tsx) remain as the actual
 * implementation; this index.ts wraps them into the manifest. When a block is
 * fully migrated (T-142+ tasks), those legacy files collapse into this folder.
 *
 * Production path: src/blocks/callout/index.ts
 */

import type { CalloutVariant } from "./schema";
import { CalloutBlockSchema } from "./schema";
import type { CalloutBlock } from "./schema";
import {
  CalloutTipTapNode,
  calloutBlockToProseMirror,
  proseMirrorToCalloutBlock,
} from "./CalloutNode";
import { Callout } from "./Callout";
import { defineBlock } from "../../src/blocks/defineBlock";
import type { ProseMirrorNode } from "../../src/editor/mapping";

/**
 * Full block manifest — consumed by runtime-registry.ts.
 *
 * `toPm` / `fromPm` delegate to the mapping helpers in CalloutNode.tsx.
 * The casts satisfy `defineBlock`'s `ProseMirrorNode` contract:
 *   - `calloutBlockToProseMirror` returns `unknown`; cast to `ProseMirrorNode`
 *     is safe because the shape matches `{ type, attrs, content }`.
 *   - `proseMirrorToCalloutBlock` expects specific attr names; cast from the
 *     generic `ProseMirrorNode` is safe because the caller guarantees node type.
 */
const calloutBlock = defineBlock<CalloutBlock>({
  schemaName: "callout",
  schema: CalloutBlockSchema,
  allowedAttrs: [
    "variant", "title", "body", "attribution", "note",
  ] as const,
  paletteLabel: "Callout",
  tiptapNode: CalloutTipTapNode,
  renderer: Callout,
  toPm: (block) => calloutBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToCalloutBlock(
      node as {
        attrs: {
          blockId: string;
          variant: CalloutVariant;
          title: string;
          attribution: string;
          note: string;
        };
        content: unknown[];
      },
    ),
});

export default calloutBlock;

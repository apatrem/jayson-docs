/**
 * src/blocks/prose/schema.ts — self-contained schema for the Prose block.
 *
 * Source of truth for ProseBlockSchema, ProseBlock, ProseAlignSchema, and
 * ProseAlign (T-144). Supersedes src/schema/blocks/prose.ts which has been
 * deleted; update any remaining imports to use this module instead.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";
import { ProseMirrorFragmentSchema } from "../../schema/prosemirror-fragment";

export const ProseAlignSchema = z.enum(["left", "justify"]);
export type ProseAlign = z.infer<typeof ProseAlignSchema>;

export const ProseBlockSchema = BlockBaseSchema.extend({
  type: z.literal("prose"),
  content: ProseMirrorFragmentSchema,
  align: ProseAlignSchema.default("left"),
}).strict();

export type ProseBlock = z.infer<typeof ProseBlockSchema>;

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "prose",
  schema: ProseBlockSchema,
  allowedAttrs: ["content", "align", "note"] as const,
  paletteLabel: "Prose",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

/**
 * src/blocks/numbered-list/schema.ts — self-contained schema for the NumberedList block.
 *
 * Source of truth for NumberedListBlockSchema, NumberedListBlock, NumberedListItem,
 * and emptyNumberedListItem (T-147). Supersedes
 * src/schema/blocks/numbered-list.ts which has been deleted.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";
import { ProseMirrorFragmentSchema } from "../../schema/prosemirror-fragment";

export const NumberedListItemSchema = z
  .object({
    text: ProseMirrorFragmentSchema,
  })
  .strict();

export type NumberedListItem = z.infer<typeof NumberedListItemSchema>;

export const NumberedListBlockSchema = BlockBaseSchema.extend({
  type: z.literal("numbered-list"),
  items: z.array(NumberedListItemSchema).min(1).max(12),
  startAt: z.number().int().min(1).optional(),
}).strict();

export type NumberedListBlock = z.infer<typeof NumberedListBlockSchema>;

export function emptyNumberedListItem(): NumberedListItem {
  return {
    text: {
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    },
  };
}

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "numbered-list",
  schema: NumberedListBlockSchema,
  allowedAttrs: ["items", "startAt", "note"] as const,
  paletteLabel: "Numbered List",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

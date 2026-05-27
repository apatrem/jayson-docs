/**
 * src/blocks/bullet-list/schema.ts — self-contained schema for the BulletList block.
 *
 * Source of truth for BulletListBlockSchema, BulletListBlock, BulletListItem,
 * BulletListChildItem, and emptyBulletListItem (T-146). Supersedes
 * src/schema/blocks/bullet-list.ts which has been deleted.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";
import { ProseMirrorFragmentSchema } from "../../schema/prosemirror-fragment";

export const BulletListChildItemSchema = z
  .object({
    text: ProseMirrorFragmentSchema,
  })
  .strict();

export type BulletListChildItem = z.infer<typeof BulletListChildItemSchema>;

export const BulletListItemSchema = z
  .object({
    text: ProseMirrorFragmentSchema,
    children: z.array(BulletListChildItemSchema).max(8).optional(),
  })
  .strict();

export type BulletListItem = z.infer<typeof BulletListItemSchema>;

export const BulletListBlockSchema = BlockBaseSchema.extend({
  type: z.literal("bullet-list"),
  items: z.array(BulletListItemSchema).min(1).max(12),
}).strict();

export type BulletListBlock = z.infer<typeof BulletListBlockSchema>;

export function emptyBulletListItem(): BulletListItem {
  return {
    text: {
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    },
  };
}

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "bullet-list",
  schema: BulletListBlockSchema,
  allowedAttrs: ["items", "note"] as const,
  paletteLabel: "Bullet List",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

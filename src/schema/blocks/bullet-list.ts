import { z } from "zod";
import { BlockBaseSchema } from "./block-base";
import { ProseMirrorFragmentSchema } from "../prosemirror-fragment";

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

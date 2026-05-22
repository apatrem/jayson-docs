import { z } from "zod";
import { BlockBaseSchema } from "./index";
import { ProseMirrorFragmentSchema } from "../prosemirror-fragment";

export const NumberedListItemSchema = z
  .object({
    text: ProseMirrorFragmentSchema,
  })
  .strict();

export type NumberedListItem = z.infer<typeof NumberedListItemSchema>;

export const NumberedListBlockSchema = BlockBaseSchema.extend({
  type: z.literal("numbered-list"),
  items: z.array(NumberedListItemSchema).min(1).max(12),
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

import { z } from "zod";
import { BlockBaseSchema } from "./index";
import { ProseMirrorFragmentSchema } from "../prosemirror-fragment";

export const ProseAlignSchema = z.enum(["left", "justify"]);

export const ProseBlockSchema = BlockBaseSchema.extend({
  type: z.literal("prose"),
  content: ProseMirrorFragmentSchema,
  align: ProseAlignSchema.default("left"),
}).strict();

export type ProseBlock = z.infer<typeof ProseBlockSchema>;
export type ProseAlign = z.infer<typeof ProseAlignSchema>;

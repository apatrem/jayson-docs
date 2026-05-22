import { z } from "zod";
import { BlockBaseSchema } from "./block-base";

export const DiagramWidthSchema = z.enum(["medium", "large", "full"]);
export type DiagramWidth = z.infer<typeof DiagramWidthSchema>;

export const DiagramBlockSchema = BlockBaseSchema.extend({
  type: z.literal("diagram"),
  source: z.string().min(1).max(4000),
  title: z.string().max(120).optional(),
  caption: z.string().max(500).optional(),
  width: DiagramWidthSchema.default("large"),
}).strict();

export type DiagramBlock = z.infer<typeof DiagramBlockSchema>;

export function diagramMaxWidthPercent(width: DiagramWidth): string {
  switch (width) {
    case "medium":
      return "60%";
    case "large":
      return "85%";
    case "full":
      return "100%";
  }
}

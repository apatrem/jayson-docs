import { z } from "zod";
import { AssetPathSchema } from "../asset-path";
import { BlockBaseSchema } from "./block-base";

export const ImageWidthSchema = z.enum(["small", "medium", "large", "full"]);
export type ImageWidth = z.infer<typeof ImageWidthSchema>;

export const ImageAlignSchema = z.enum(["left", "center", "right"]);
export type ImageAlign = z.infer<typeof ImageAlignSchema>;

export const ImageBlockSchema = BlockBaseSchema.extend({
  type: z.literal("image"),
  src: AssetPathSchema,
  alt: z.string().min(1),
  caption: z.string().optional(),
  width: ImageWidthSchema.default("medium"),
  align: ImageAlignSchema.default("center"),
}).strict();

export type ImageBlock = z.infer<typeof ImageBlockSchema>;

export function imageMaxWidthPercent(width: ImageWidth): string {
  switch (width) {
    case "small":
      return "40%";
    case "medium":
      return "60%";
    case "large":
      return "85%";
    case "full":
      return "100%";
  }
}

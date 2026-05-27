/**
 * src/blocks/image/schema.ts — self-contained schema for the Image block.
 *
 * Source of truth for ImageWidthSchema, ImageWidth, ImageAlignSchema, ImageAlign,
 * ImageBlockSchema, ImageBlock, and imageMaxWidthPercent (T-148). Supersedes
 * src/schema/blocks/image.ts which has been deleted.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";
import { AssetPathSchema } from "../../schema/asset-path";

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

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "image",
  schema: ImageBlockSchema,
  allowedAttrs: ["src", "alt", "caption", "width", "align", "note"] as const,
  paletteLabel: "Image",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

import { z } from "zod";
import { BlockBaseSchema } from "./index";

export const HeadingLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type HeadingLevel = z.infer<typeof HeadingLevelSchema>;

export const HeadingBlockSchema = BlockBaseSchema.extend({
  type: z.literal("heading"),
  level: HeadingLevelSchema,
  text: z.string().min(1).max(200),
  numbered: z.boolean().default(true),
}).strict();

export type HeadingBlock = z.infer<typeof HeadingBlockSchema>;

export function headingScaleKey(level: HeadingLevel): "h1" | "h2" | "h3" | "h4" {
  switch (level) {
    case 1:
      return "h1";
    case 2:
      return "h2";
    case 3:
      return "h3";
    case 4:
      return "h4";
  }
}

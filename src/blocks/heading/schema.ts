/**
 * src/blocks/heading/schema.ts — self-contained schema for the Heading block.
 *
 * Source of truth for HeadingBlockSchema, HeadingBlock, HeadingLevel, and
 * headingScaleKey (T-143). Supersedes src/schema/blocks/heading.ts which has
 * been deleted; update any remaining imports to use this module instead.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";

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

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "heading",
  schema: HeadingBlockSchema,
  allowedAttrs: ["level", "text", "numbered", "note"] as const,
  paletteLabel: "Heading",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

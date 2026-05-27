/**
 * src/blocks/diagram/schema.ts — self-contained schema for the Diagram block.
 *
 * Source of truth for DiagramWidthSchema, DiagramWidth, DiagramBlockSchema,
 * DiagramBlock, and diagramMaxWidthPercent (T-149). Supersedes
 * src/schema/blocks/diagram.ts which has been deleted.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";

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

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "diagram",
  schema: DiagramBlockSchema,
  allowedAttrs: ["source", "title", "caption", "width", "note"] as const,
  paletteLabel: "Diagram",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

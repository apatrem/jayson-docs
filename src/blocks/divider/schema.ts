/**
 * src/blocks/divider/schema.ts — self-contained schema for the Divider block.
 *
 * Source of truth for DividerBlockSchema and DividerBlock type (T-142).
 * Also exports the schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";

export const DividerBlockSchema = BlockBaseSchema.extend({
  type: z.literal("divider"),
  label: z.string().max(80).optional(),
  subtitle: z.string().max(120).optional(),
  numbering: z.string().max(40).optional(),
}).strict();

export type DividerBlock = z.infer<typeof DividerBlockSchema>;

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "divider",
  schema: DividerBlockSchema,
  allowedAttrs: ["label", "subtitle", "numbering", "note"] as const,
  paletteLabel: "Divider",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

/**
 * src/blocks/divider/schema.ts — pure schema entry for the Divider block.
 *
 * Re-exports everything from src/schema/blocks/divider.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { DividerBlockSchema } from "../../schema/blocks/divider";
export * from "../../schema/blocks/divider";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "divider",
  schema: DividerBlockSchema,
  allowedAttrs: ["label", "subtitle", "numbering", "note"] as const,
  paletteLabel: "Divider",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

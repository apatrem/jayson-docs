/**
 * src/blocks/numbered-list/schema.ts — pure schema entry for the Numbered List block.
 *
 * Re-exports everything from src/schema/blocks/numbered-list.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { NumberedListBlockSchema } from "../../schema/blocks/numbered-list";
export * from "../../schema/blocks/numbered-list";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "numbered-list",
  schema: NumberedListBlockSchema,
  allowedAttrs: ["items", "startAt", "note"] as const,
  paletteLabel: "Numbered List",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

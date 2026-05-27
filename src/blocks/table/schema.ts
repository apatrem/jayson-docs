/**
 * src/blocks/table/schema.ts — pure schema entry for the Table block.
 *
 * Re-exports everything from src/schema/blocks/table.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { TableBlockDataSchema } from "../../schema/blocks/table";
export * from "../../schema/blocks/table";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "table",
  schema: TableBlockDataSchema,
  allowedAttrs: ["columns", "rows", "caption", "note"] as const,
  paletteLabel: "Table",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

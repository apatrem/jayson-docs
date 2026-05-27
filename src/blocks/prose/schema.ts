/**
 * src/blocks/prose/schema.ts — pure schema entry for the Prose block.
 *
 * Re-exports everything from src/schema/blocks/prose.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { ProseBlockSchema } from "../../schema/blocks/prose";
export * from "../../schema/blocks/prose";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "prose",
  schema: ProseBlockSchema,
  allowedAttrs: ["content", "align", "note"] as const,
  paletteLabel: "Prose",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

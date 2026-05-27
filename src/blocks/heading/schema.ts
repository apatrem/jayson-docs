/**
 * src/blocks/heading/schema.ts — pure schema entry for the Heading block.
 *
 * Re-exports everything from src/schema/blocks/heading.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { HeadingBlockSchema } from "../../schema/blocks/heading";
export * from "../../schema/blocks/heading";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "heading",
  schema: HeadingBlockSchema,
  allowedAttrs: ["level", "text", "numbered", "note"] as const,
  paletteLabel: "Heading",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

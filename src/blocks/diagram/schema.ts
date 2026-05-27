/**
 * src/blocks/diagram/schema.ts — pure schema entry for the Diagram block.
 *
 * Re-exports everything from src/schema/blocks/diagram.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { DiagramBlockSchema } from "../../schema/blocks/diagram";
export * from "../../schema/blocks/diagram";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "diagram",
  schema: DiagramBlockSchema,
  allowedAttrs: ["source", "title", "caption", "width", "note"] as const,
  paletteLabel: "Diagram",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

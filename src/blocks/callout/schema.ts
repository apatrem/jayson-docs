/**
 * src/blocks/callout/schema.ts — pure schema entry for the Callout block.
 *
 * Re-exports everything from src/schema/blocks/callout.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { CalloutBlockSchema } from "../../schema/blocks/callout";
export * from "../../schema/blocks/callout";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "callout",
  schema: CalloutBlockSchema,
  allowedAttrs: ["variant", "title", "body", "attribution", "note"] as const,
  paletteLabel: "Callout",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

/**
 * src/blocks/image/schema.ts — pure schema entry for the Image block.
 *
 * Re-exports everything from src/schema/blocks/image.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { ImageBlockSchema } from "../../schema/blocks/image";
export * from "../../schema/blocks/image";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "image",
  schema: ImageBlockSchema,
  allowedAttrs: ["src", "alt", "caption", "width", "align", "note"] as const,
  paletteLabel: "Image",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

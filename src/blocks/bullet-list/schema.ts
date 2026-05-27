/**
 * src/blocks/bullet-list/schema.ts — pure schema entry for the Bullet List block.
 *
 * Re-exports everything from src/schema/blocks/bullet-list.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { BulletListBlockSchema } from "../../schema/blocks/bullet-list";
export * from "../../schema/blocks/bullet-list";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "bullet-list",
  schema: BulletListBlockSchema,
  allowedAttrs: ["items", "note"] as const,
  paletteLabel: "Bullet List",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

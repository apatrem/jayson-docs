/**
 * src/blocks/team/schema.ts — pure schema entry for the Team block.
 *
 * Re-exports everything from src/schema/blocks/team.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { TeamBlockSchema } from "../../schema/blocks/team";
export * from "../../schema/blocks/team";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "team",
  schema: TeamBlockSchema,
  allowedAttrs: ["layout", "members", "note"] as const,
  paletteLabel: "Team",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

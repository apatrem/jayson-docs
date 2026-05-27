/**
 * src/blocks/roadmap/schema.ts — pure schema entry for the Roadmap block.
 *
 * Re-exports everything from src/schema/blocks/roadmap.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { RoadmapBlockDataSchema } from "../../schema/blocks/roadmap";
export * from "../../schema/blocks/roadmap";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "roadmap",
  schema: RoadmapBlockDataSchema,
  allowedAttrs: ["timeUnit", "startDate", "endDate", "workstreams", "milestones", "note"] as const,
  paletteLabel: "Roadmap",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

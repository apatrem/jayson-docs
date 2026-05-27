/**
 * src/blocks/chart/schema.ts — pure schema entry for the Chart block.
 *
 * Re-exports everything from src/schema/blocks/chart.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { ChartBlockSchema } from "../../schema/blocks/chart";
export * from "../../schema/blocks/chart";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "chart",
  schema: ChartBlockSchema,
  allowedAttrs: ["chartType", "title", "takeaway", "data", "axes", "palette", "showLegend", "showDataLabels", "note"] as const,
  paletteLabel: "Chart",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

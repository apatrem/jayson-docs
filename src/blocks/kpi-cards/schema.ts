/**
 * src/blocks/kpi-cards/schema.ts — pure schema entry for the KPI Cards block.
 *
 * Re-exports everything from src/schema/blocks/kpi-cards.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { KpiCardsBlockSchema } from "../../schema/blocks/kpi-cards";
export * from "../../schema/blocks/kpi-cards";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "kpi-cards",
  schema: KpiCardsBlockSchema,
  allowedAttrs: ["cards", "note"] as const,
  paletteLabel: "KPI Cards",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

/**
 * src/blocks/risk-matrix/schema.ts — pure schema entry for the Risk Matrix block.
 *
 * Re-exports everything from src/schema/blocks/risk-matrix.ts so callers
 * can import block types and helpers from either location. Also exports the
 * schemaEntry consumed by src/blocks/schema-registry.ts.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import type { z } from "zod";
import { RiskMatrixBlockDataSchema } from "../../schema/blocks/risk-matrix";
export * from "../../schema/blocks/risk-matrix";

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "risk-matrix",
  schema: RiskMatrixBlockDataSchema,
  allowedAttrs: ["gridSize", "xAxisLabel", "yAxisLabel", "risks", "note"] as const,
  paletteLabel: "Risk Matrix",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

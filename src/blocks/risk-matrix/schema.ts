/**
 * src/blocks/risk-matrix/schema.ts — self-contained schema for the RiskMatrix block.
 *
 * Source of truth for RiskMatrixGridSizeSchema, RiskSeveritySchema, RiskMatrixItemSchema,
 * RiskMatrixBlockDataSchema, RiskMatrixBlockSchema, RiskMatrixBlock, and helpers (T-152).
 * Supersedes src/schema/blocks/risk-matrix.ts which has been deleted.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";

export const RiskMatrixGridSizeSchema = z.enum(["2x2", "3x3"]);
export type RiskMatrixGridSize = z.infer<typeof RiskMatrixGridSizeSchema>;

export const RiskSeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type RiskSeverity = z.infer<typeof RiskSeveritySchema>;

export const RiskMatrixItemSchema = z
  .object({
    label: z.string().min(1).max(40),
    x: z.number().int(),
    y: z.number().int(),
    severity: RiskSeveritySchema,
  })
  .strict();

export type RiskMatrixItem = z.infer<typeof RiskMatrixItemSchema>;

export const RiskMatrixBlockDataSchema = BlockBaseSchema.extend({
  type: z.literal("risk-matrix"),
  gridSize: RiskMatrixGridSizeSchema.default("3x3"),
  xAxisLabel: z.string().min(1).max(40).default("Likelihood"),
  yAxisLabel: z.string().min(1).max(40).default("Impact"),
  risks: z.array(RiskMatrixItemSchema).min(1).max(20),
}).strict();

export function riskMatrixDimension(gridSize: RiskMatrixGridSize): number {
  return gridSize === "2x2" ? 2 : 3;
}

export function severityStatusToken(severity: RiskSeverity): string {
  switch (severity) {
    case "low":
      return "colors.status.success";
    case "medium":
      return "colors.status.warning";
    case "high":
    case "critical":
      return "colors.status.error";
  }
}

function validateRiskCoordinates(
  block: z.infer<typeof RiskMatrixBlockDataSchema>,
  ctx: z.RefinementCtx,
): void {
  const max = riskMatrixDimension(block.gridSize);
  for (let i = 0; i < block.risks.length; i++) {
    const risk = block.risks[i];
    if (!risk) continue;
    if (risk.x < 1 || risk.x > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["risks", i, "x"],
        message: `x must be between 1 and ${max} for a ${block.gridSize} grid.`,
      });
    }
    if (risk.y < 1 || risk.y > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["risks", i, "y"],
        message: `y must be between 1 and ${max} for a ${block.gridSize} grid.`,
      });
    }
  }
}

export const RiskMatrixBlockSchema = RiskMatrixBlockDataSchema.superRefine(
  validateRiskCoordinates,
);

export type RiskMatrixBlock = z.infer<typeof RiskMatrixBlockDataSchema>;

export function defaultRiskMatrixItem(
  label: string,
  x: number,
  y: number,
  severity: RiskSeverity = "medium",
): RiskMatrixItem {
  return { label, x, y, severity };
}

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "risk-matrix",
  schema: RiskMatrixBlockDataSchema,
  allowedAttrs: ["gridSize", "xAxisLabel", "yAxisLabel", "risks", "note"] as const,
  paletteLabel: "Risk Matrix",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

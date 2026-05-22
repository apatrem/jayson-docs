import { z } from "zod";
import { BlockBaseSchema } from "./block-base";

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

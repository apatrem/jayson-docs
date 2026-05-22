import { z } from "zod";
import { parseISO } from "date-fns";
import { BlockBaseSchema } from "./block-base";

export const RoadmapTimeUnitSchema = z.enum(["week", "month", "quarter"]);
export type RoadmapTimeUnit = z.infer<typeof RoadmapTimeUnitSchema>;

export const RoadmapWorkstreamColorSchema = z.enum([
  "auto",
  "brand.primary",
  "brand.secondary",
]);
export type RoadmapWorkstreamColor = z.infer<typeof RoadmapWorkstreamColorSchema>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected ISO date YYYY-MM-DD");

export const RoadmapWorkstreamSchema = z
  .object({
    label: z.string().min(1).max(80),
    startDate: isoDate,
    endDate: isoDate,
    color: RoadmapWorkstreamColorSchema.default("auto"),
  })
  .strict();

export type RoadmapWorkstream = z.infer<typeof RoadmapWorkstreamSchema>;

export const RoadmapMilestoneSchema = z
  .object({
    label: z.string().min(1).max(80),
    date: isoDate,
  })
  .strict();

export type RoadmapMilestone = z.infer<typeof RoadmapMilestoneSchema>;

export const RoadmapBlockDataSchema = BlockBaseSchema.extend({
  type: z.literal("roadmap"),
  timeUnit: RoadmapTimeUnitSchema,
  startDate: isoDate,
  endDate: isoDate,
  workstreams: z.array(RoadmapWorkstreamSchema).min(1).max(8),
  milestones: z.array(RoadmapMilestoneSchema).max(12).optional(),
}).strict();

function validateRoadmapDates(
  block: z.infer<typeof RoadmapBlockDataSchema>,
  ctx: z.RefinementCtx,
): void {
  const rangeStart = parseISO(block.startDate);
  const rangeEnd = parseISO(block.endDate);
  if (rangeEnd < rangeStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "endDate must be on or after startDate.",
    });
  }

  for (let i = 0; i < block.workstreams.length; i++) {
    const ws = block.workstreams[i];
    if (!ws) continue;
    const wsStart = parseISO(ws.startDate);
    const wsEnd = parseISO(ws.endDate);
    if (wsEnd < wsStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["workstreams", i, "endDate"],
        message: "Workstream endDate must be on or after its startDate.",
      });
    }
  }

  for (const [i, milestone] of (block.milestones ?? []).entries()) {
    const date = parseISO(milestone.date);
    if (date < rangeStart || date > rangeEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["milestones", i, "date"],
        message: "Milestone date must fall within the roadmap range.",
      });
    }
  }
}

export const RoadmapBlockSchema = RoadmapBlockDataSchema.superRefine(
  validateRoadmapDates,
);

export type RoadmapBlock = z.infer<typeof RoadmapBlockDataSchema>;

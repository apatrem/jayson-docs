import { z } from "zod";
import { BlockBaseSchema } from "./block-base";

export const TimelineOrientationSchema = z.enum(["horizontal", "vertical"]);
export type TimelineOrientation = z.infer<typeof TimelineOrientationSchema>;

export const TimelineConnectorSchema = z.enum(["arrow", "line", "none"]);
export type TimelineConnector = z.infer<typeof TimelineConnectorSchema>;

export const TimelinePhaseSchema = z
  .object({
    label: z.string().min(1).max(40),
    subtitle: z.string().max(80).optional(),
    body: z.string().max(200).optional(),
    duration: z.string().max(40).optional(),
  })
  .strict();

export type TimelinePhase = z.infer<typeof TimelinePhaseSchema>;

export const TimelineBlockSchema = BlockBaseSchema.extend({
  type: z.literal("timeline"),
  phases: z.array(TimelinePhaseSchema).min(2).max(7),
  orientation: TimelineOrientationSchema.default("horizontal"),
  connector: TimelineConnectorSchema.default("arrow"),
}).strict();

export type TimelineBlock = z.infer<typeof TimelineBlockSchema>;

export function defaultTimelinePhase(label: string): TimelinePhase {
  return { label };
}

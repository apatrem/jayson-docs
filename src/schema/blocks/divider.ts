import { z } from "zod";
import { BlockBaseSchema } from "./block-base";

export const DividerBlockSchema = BlockBaseSchema.extend({
  type: z.literal("divider"),
  label: z.string().max(80).optional(),
  subtitle: z.string().max(120).optional(),
  numbering: z.string().max(40).optional(),
}).strict();

export type DividerBlock = z.infer<typeof DividerBlockSchema>;

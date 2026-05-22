import { z } from "zod";
import { StableIdSchema } from "../stable-id";

/**
 * Common fields on every block. All concrete block schemas extend this.
 */
export const BlockBaseSchema = z
  .object({
    id: StableIdSchema,
    type: z.string(),
    note: z.string().max(500).optional(),
  })
  .strict();

export type BlockBase = z.infer<typeof BlockBaseSchema>;

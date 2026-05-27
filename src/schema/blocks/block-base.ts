import { z } from "zod";
import { StableIdSchema } from "../stable-id";
import { BlockTypeStringSchema } from "./block-type-string";

/**
 * Common fields on every block. All concrete block schemas extend this.
 *
 * `type` is validated against BlockTypeStringSchema — accepts either a
 * Standard/Brand kebab-case identifier or an Authored `{sender}:{slug}` string.
 * Concrete block schemas override this field with a z.literal() discriminant.
 */
export const BlockBaseSchema = z
  .object({
    id: StableIdSchema,
    type: BlockTypeStringSchema,
    note: z.string().max(500).optional(),
  })
  .strict();

export type BlockBase = z.infer<typeof BlockBaseSchema>;

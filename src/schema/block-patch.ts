import { z } from "zod";
import { BlockBaseSchema } from "./blocks";
import { StableIdSchema } from "./stable-id";

/** Block payload in patches — full union validation deferred to T-28. */
const PatchBlockSchema = BlockBaseSchema.extend({}).passthrough();

/**
 * A BlockPatch is the only way the AI is allowed to modify a document.
 */
export const BlockPatchSchema = z.discriminatedUnion("op", [
  z
    .object({
      op: z.literal("replace"),
      blockId: StableIdSchema,
      block: PatchBlockSchema,
      reason: z.string().max(500).optional(),
    })
    .strict(),

  z
    .object({
      op: z.literal("remove"),
      blockId: StableIdSchema,
      reason: z.string().max(500).optional(),
    })
    .strict(),

  z
    .object({
      op: z.literal("insert-after"),
      afterBlockId: StableIdSchema,
      block: PatchBlockSchema,
      reason: z.string().max(500).optional(),
    })
    .strict(),
]);

export type BlockPatch = z.infer<typeof BlockPatchSchema>;

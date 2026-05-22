export { BlockBaseSchema, type BlockBase } from "./block-base";
import { z } from "zod";
import { ProseBlockSchema } from "./prose";
import { HeadingBlockSchema } from "./heading";
import { BulletListBlockSchema } from "./bullet-list";
import { NumberedListBlockSchema } from "./numbered-list";
import { CalloutBlockSchema } from "./callout";

/** Discriminated union of all implemented block types (grows with T-29+). */
export const BlockSchema = z.discriminatedUnion("type", [
  ProseBlockSchema,
  HeadingBlockSchema,
  BulletListBlockSchema,
  NumberedListBlockSchema,
  CalloutBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;

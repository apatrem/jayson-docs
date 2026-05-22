export { BlockBaseSchema, type BlockBase } from "./block-base";
import { z } from "zod";
import { ProseBlockSchema } from "./prose";
import { HeadingBlockSchema } from "./heading";
import { BulletListBlockSchema } from "./bullet-list";
import { NumberedListBlockSchema } from "./numbered-list";
import { CalloutBlockSchema } from "./callout";
import { KpiCardsBlockSchema } from "./kpi-cards";
import { ImageBlockSchema } from "./image";

/** Discriminated union of all implemented block types (grows with T-31+). */
export const BlockSchema = z.discriminatedUnion("type", [
  ProseBlockSchema,
  HeadingBlockSchema,
  BulletListBlockSchema,
  NumberedListBlockSchema,
  CalloutBlockSchema,
  KpiCardsBlockSchema,
  ImageBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;

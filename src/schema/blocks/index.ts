export { BlockBaseSchema, type BlockBase } from "./block-base";
import { z } from "zod";
import { ProseBlockSchema } from "../../blocks/prose/schema";
import { HeadingBlockSchema } from "../../blocks/heading/schema";
import { BulletListBlockSchema } from "../../blocks/bullet-list/schema";
import { NumberedListBlockSchema } from "../../blocks/numbered-list/schema";
import { CalloutBlockSchema } from "../../blocks/callout/schema";
import { KpiCardsBlockSchema } from "./kpi-cards";
import { ImageBlockSchema } from "../../blocks/image/schema";
import { TableBlockDataSchema } from "./table";
import { ChartBlockDataSchema } from "./chart";
import { TimelineBlockSchema } from "./timeline";
import { RoadmapBlockDataSchema } from "./roadmap";
import { TeamBlockSchema } from "./team";
import { RiskMatrixBlockDataSchema } from "./risk-matrix";
import { DiagramBlockSchema } from "../../blocks/diagram/schema";
import { DividerBlockSchema } from "../../blocks/divider/schema";

/** Discriminated union of all 15 pre-built block types. */
export const BlockSchema = z.discriminatedUnion("type", [
  ProseBlockSchema,
  HeadingBlockSchema,
  BulletListBlockSchema,
  NumberedListBlockSchema,
  CalloutBlockSchema,
  KpiCardsBlockSchema,
  ImageBlockSchema,
  TableBlockDataSchema,
  ChartBlockDataSchema,
  TimelineBlockSchema,
  RoadmapBlockDataSchema,
  RiskMatrixBlockDataSchema,
  TeamBlockSchema,
  DiagramBlockSchema,
  DividerBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;

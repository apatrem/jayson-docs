export { BlockBaseSchema, type BlockBase } from "./block-base";
import { z } from "zod";
import { ProseBlockSchema } from "../../blocks/prose/schema";
import { HeadingBlockSchema } from "../../blocks/heading/schema";
import { BulletListBlockSchema } from "../../blocks/bullet-list/schema";
import { NumberedListBlockSchema } from "../../blocks/numbered-list/schema";
import { CalloutBlockSchema } from "../../blocks/callout/schema";
import { KpiCardsBlockSchema } from "../../blocks/kpi-cards/schema";
import { ImageBlockSchema } from "../../blocks/image/schema";
import { TableBlockDataSchema } from "../../blocks/table/schema";
import { ChartBlockDataSchema } from "../../blocks/chart/schema";
import { TimelineBlockSchema } from "../../blocks/timeline/schema";
import { RoadmapBlockDataSchema } from "../../blocks/roadmap/schema";
import { TeamBlockSchema } from "../../blocks/team/schema";
import { RiskMatrixBlockDataSchema } from "../../blocks/risk-matrix/schema";
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

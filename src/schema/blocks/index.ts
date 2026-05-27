export { BlockBaseSchema, type BlockBase } from "./block-base";
import { z } from "zod";
import { ProseBlockSchema } from "../../blocks/prose/schema";
import { HeadingBlockSchema } from "../../blocks/heading/schema";
import { BulletListBlockSchema } from "./bullet-list";
import { NumberedListBlockSchema } from "./numbered-list";
import { CalloutBlockSchema } from "./callout";
import { KpiCardsBlockSchema } from "./kpi-cards";
import { ImageBlockSchema } from "./image";
import { TableBlockDataSchema } from "./table";
import { ChartBlockDataSchema } from "./chart";
import { TimelineBlockSchema } from "./timeline";
import { RoadmapBlockDataSchema } from "./roadmap";
import { TeamBlockSchema } from "./team";
import { RiskMatrixBlockDataSchema } from "./risk-matrix";
import { DiagramBlockSchema } from "./diagram";
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

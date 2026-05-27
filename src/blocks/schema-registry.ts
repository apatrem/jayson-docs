import type { SchemaEntry } from "./defineBlock";
import { schemaEntry as bulletListEntry } from "./bullet-list/schema";
import { schemaEntry as calloutEntry } from "./callout/schema";
import { schemaEntry as chartEntry } from "./chart/schema";
import { schemaEntry as diagramEntry } from "./diagram/schema";
import { schemaEntry as dividerEntry } from "./divider/schema";
import { schemaEntry as headingEntry } from "./heading/schema";
import { schemaEntry as imageEntry } from "./image/schema";
import { schemaEntry as kpiCardsEntry } from "./kpi-cards/schema";
import { schemaEntry as numberedListEntry } from "./numbered-list/schema";
import { schemaEntry as proseEntry } from "./prose/schema";
import { schemaEntry as riskMatrixEntry } from "./risk-matrix/schema";
import { schemaEntry as roadmapEntry } from "./roadmap/schema";
import { schemaEntry as tableEntry } from "./table/schema";
import { schemaEntry as teamEntry } from "./team/schema";
import { schemaEntry as timelineEntry } from "./timeline/schema";

/**
 * Pure schema registry — no React, TipTap, or renderer imports allowed.
 * Populated at boot by loadAllSchemas().
 */
export const schemaRegistry: readonly SchemaEntry[] = [];

/**
 * Statically imports every Standard block's schema.ts and returns all entries.
 *
 * Each block's schema.ts re-exports its src/schema/blocks/<name>.ts and adds
 * a schemaEntry object consumed here. Pure: no React, TipTap, or src/renderer/
 * in the transitive import graph (enforced by tests/blocks/schema-purity.test.ts).
 */
export function loadAllSchemas(): readonly SchemaEntry[] {
  return [
    bulletListEntry,
    calloutEntry,
    chartEntry,
    diagramEntry,
    dividerEntry,
    headingEntry,
    imageEntry,
    kpiCardsEntry,
    numberedListEntry,
    proseEntry,
    riskMatrixEntry,
    roadmapEntry,
    tableEntry,
    teamEntry,
    timelineEntry,
  ];
}

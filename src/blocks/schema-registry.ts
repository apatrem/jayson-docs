import type { SchemaEntry } from "./defineBlock";

/**
 * Pure schema registry — no React, TipTap, or renderer imports allowed.
 * Populated at boot by loadAllSchemas().
 */
export const schemaRegistry: readonly SchemaEntry[] = [];

/**
 * Statically imports every Standard block's schema.ts and returns all entries.
 *
 * Import lines below are stubs — each is uncommented in T-141 as the
 * corresponding src/blocks/<name>/schema.ts file is created.
 *
 * Returns an empty array until T-141 scaffolds the per-block folders.
 */
export function loadAllSchemas(): readonly SchemaEntry[] {
  const entries: SchemaEntry[] = [
    // T-141: import { schemaEntry as calloutEntry } from './callout/schema';
    // T-141: import { schemaEntry as chartEntry } from './chart/schema';
    // T-141: import { schemaEntry as diagramEntry } from './diagram/schema';
    // T-141: import { schemaEntry as dividerEntry } from './divider/schema';
    // T-141: import { schemaEntry as headingEntry } from './heading/schema';
    // T-141: import { schemaEntry as imageEntry } from './image/schema';
    // T-141: import { schemaEntry as kpiCardsEntry } from './kpi-cards/schema';
    // T-141: import { schemaEntry as proseEntry } from './prose/schema';
    // T-141: import { schemaEntry as riskMatrixEntry } from './risk-matrix/schema';
    // T-141: import { schemaEntry as roadmapEntry } from './roadmap/schema';
    // T-141: import { schemaEntry as tableEntry } from './table/schema';
    // T-141: import { schemaEntry as teamEntry } from './team/schema';
    // T-141: import { schemaEntry as timelineEntry } from './timeline/schema';
    // T-141: import { schemaEntry as bulletListEntry } from './bullet-list/schema';
    // T-141: import { schemaEntry as numberedListEntry } from './numbered-list/schema';
  ];
  return entries;
}

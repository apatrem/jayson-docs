import { z } from "zod";
// Import SchemaEntry from the pure file — not from defineBlock.ts — so this
// module (and src/schema/blocks/index.ts which re-exports from here) remain
// free of @tiptap/core (enforced by tests/blocks/schema-purity.test.ts).
import type { SchemaEntry } from "./schema-entry-type";

// ── Per-block schema imports (schemaEntry + typed Zod schema) ─────────────
// Each block's schema.ts exports a `schemaEntry` (consumed by loadAllSchemas)
// and a typed Zod schema (consumed by BlockSchema below).  Both are imported
// here in a single statement per block so the list is maintained in one place.

import {
  schemaEntry as bulletListEntry,
  BulletListBlockSchema,
} from "./bullet-list/schema";
import {
  schemaEntry as calloutEntry,
  CalloutBlockSchema,
} from "./callout/schema";
import {
  schemaEntry as chartEntry,
  // ChartBlockSchema is ZodEffects (has .superRefine), which Zod's
  // z.discriminatedUnion does not accept. Use the base ZodObject instead.
  ChartBlockDataSchema,
} from "./chart/schema";
import {
  schemaEntry as diagramEntry,
  DiagramBlockSchema,
} from "./diagram/schema";
import {
  schemaEntry as dividerEntry,
  DividerBlockSchema,
} from "./divider/schema";
import {
  schemaEntry as headingEntry,
  HeadingBlockSchema,
} from "./heading/schema";
import {
  schemaEntry as imageEntry,
  ImageBlockSchema,
} from "./image/schema";
import {
  schemaEntry as kpiCardsEntry,
  KpiCardsBlockSchema,
} from "./kpi-cards/schema";
import {
  schemaEntry as numberedListEntry,
  NumberedListBlockSchema,
} from "./numbered-list/schema";
import {
  schemaEntry as proseEntry,
  ProseBlockSchema,
} from "./prose/schema";
import {
  schemaEntry as riskMatrixEntry,
  RiskMatrixBlockDataSchema,
} from "./risk-matrix/schema";
import {
  schemaEntry as roadmapEntry,
  RoadmapBlockDataSchema,
} from "./roadmap/schema";
import {
  schemaEntry as tableEntry,
  TableBlockDataSchema,
} from "./table/schema";
import {
  schemaEntry as teamEntry,
  TeamBlockSchema,
} from "./team/schema";
import {
  schemaEntry as timelineEntry,
  TimelineBlockSchema,
} from "./timeline/schema";

/**
 * Pure schema registry — no React, TipTap, or renderer imports allowed.
 * Populated at boot by loadAllSchemas().
 */
export const schemaRegistry: readonly SchemaEntry[] = [];

/**
 * Statically imports every Standard block's schema.ts and returns all entries.
 *
 * Each block's schema.ts adds a schemaEntry object consumed here.
 * Pure: no React, TipTap, or src/renderer/ in the transitive import graph
 * (enforced by tests/blocks/schema-purity.test.ts).
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

// ── Block discriminated union (T-157c) ────────────────────────────────────
// Derived from the registry schemas rather than a hand-maintained list in
// src/schema/blocks/index.ts. src/schema/blocks/index.ts re-exports these.
//
// Note: Zod's z.discriminatedUnion requires ZodObject members only —
// ZodEffects (e.g. from .superRefine()) are not accepted.  ChartBlockSchema
// is ZodEffects, so we use ChartBlockDataSchema (the base ZodObject) here.
// Cross-field chart validation still runs via the schemaEntry (which carries
// ChartBlockSchema) when individual block schemas are validated directly.

export const BlockSchema = z.discriminatedUnion("type", [
  BulletListBlockSchema,
  CalloutBlockSchema,
  ChartBlockDataSchema,
  DiagramBlockSchema,
  DividerBlockSchema,
  HeadingBlockSchema,
  ImageBlockSchema,
  KpiCardsBlockSchema,
  NumberedListBlockSchema,
  ProseBlockSchema,
  RiskMatrixBlockDataSchema,
  RoadmapBlockDataSchema,
  TableBlockDataSchema,
  TeamBlockSchema,
  TimelineBlockSchema,
]);

/** Discriminated union of all 15 Standard block types. */
export type Block = z.infer<typeof BlockSchema>;

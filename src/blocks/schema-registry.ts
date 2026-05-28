import { z } from "zod";
// Import SchemaEntry from the pure file — not from defineBlock.ts — so this
// module (and src/schema/blocks/index.ts which re-exports from here) remain
// free of @tiptap/core (enforced by tests/blocks/schema-purity.test.ts).
import type { SchemaEntry } from "./schema-entry-type";
import { BlockBaseSchema } from "../schema/blocks/block-base";
import { AUTHORED_TYPE_RE } from "../schema/blocks/block-type-string";

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

// ── Authored blocks in the DocModel (ADR-0016) ─────────────────────────────
// Authored blocks persist with an `{sender}:{slug}` type (ADR-0009) and carry
// per-manifest dynamic attrs, so the DocModel layer validates only the common
// shape and passes attr fields through. Their manifest-specific validation is
// not a DocModel-parse concern; ADR-0013 guarantees the data can't execute.

const AuthoredBodySchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.unknown()),
  })
  .optional();

/** Structural schema for an Authored block as stored in a DocModel. */
export const AuthoredDocBlockSchema = BlockBaseSchema.extend({
  type: z
    .string()
    .regex(AUTHORED_TYPE_RE, "Authored block type must be '{sender-email}:{slug}'"),
  body: AuthoredBodySchema,
}).passthrough();

/** An Authored block as stored in a DocModel (`{sender}:{slug}`). */
export type AuthoredDocBlock = z.infer<typeof AuthoredDocBlockSchema>;

/**
 * A block as stored in a DocModel section/slide: a Standard block (strictly
 * validated, with defaults applied) or an Authored block (structurally
 * validated, attrs passthrough).
 *
 * Dispatched by `type` rather than composed with `z.union`: an outer union
 * aggregates both branches' errors, so a Standard block with a missing field
 * would misleadingly surface the authored branch's "type invalid" error. By
 * routing on `type` first, each branch reports its own precise errors
 * (`BlockSchema`'s discriminated-union diagnostics for Standard blocks) and the
 * chosen branch's transforms/defaults are preserved (the `.transform` re-parse
 * runs only when validation passes).
 */
function docBlockSchemaFor(type: unknown): z.ZodTypeAny {
  return typeof type === "string" && AUTHORED_TYPE_RE.test(type)
    ? AuthoredDocBlockSchema
    : BlockSchema;
}

// Inferred output is typed as Block (the 15-union) for ergonomics: widening
// Section.blocks to include the authored shape would ripple a `DocBlock` type
// through every renderer/layout/export. Authored blocks are genuinely present
// at runtime (validated structurally above) but typed as Block — consumers that
// care already branch on `isAuthoredBlockType(block.type)` defensively, and the
// editor↔DocModel mapping resolves them via the installed set (ADR-0016).
export const DocBlockSchema = z
  .unknown()
  .superRefine((val, ctx) => {
    const type = (val as { type?: unknown } | null | undefined)?.type;
    const result = docBlockSchemaFor(type).safeParse(val);
    if (!result.success) {
      for (const issue of result.error.issues) {
        // Zod prepends ctx.path, so issue.path (relative to the block) becomes
        // the full `sections.N.blocks.M.<field>` path.
        ctx.addIssue(issue as unknown as z.IssueData);
      }
    }
  })
  .transform(
    (val): Block =>
      docBlockSchemaFor((val as { type?: unknown })?.type).parse(val) as Block,
  ) as unknown as z.ZodType<Block>;

/**
 * The conceptual shape of a block as stored in a DocModel: a Standard
 * {@link Block} or an {@link AuthoredDocBlock}. Used in documentation and the
 * editor↔DocModel mapping; `Section.blocks` is typed `Block[]` (see above).
 */
export type DocBlock = Block | AuthoredDocBlock;

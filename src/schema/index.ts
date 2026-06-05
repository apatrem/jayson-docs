import { z } from 'zod';
import { slideSchema } from './slide.js';
import { blockSchema } from './block.js';
import { datasetSchema } from './chart.js';

/**
 * Shared envelope metadata. `templateId` selects the master template; the
 * deliverable *type* (commercial proposal vs report) is implied by it.
 */
const metaSchema = z.object({
  templateId: z.string().min(1),
  client: z.string().min(1),
  date: z.string(),
  language: z.enum(['fr', 'en']),
});

/**
 * Two-level body model (CONTEXT.md / DECISIONS_LOG D12). A **Section** is the
 * universal grouping unit (chapter / part); it feeds the tracker breadcrumb and
 * numbering and sits *above* the layout-bearing unit.
 */

// A deck section groups one or more Slides — each Slide picks a `layoutId`.
const deckSectionSchema = z.object({
  title: z.string().min(1),
  slides: z.array(slideSchema).min(1),
});

// A document section groups blocks directly — no slide layer, no `layoutId`
// (Word reflows; see Q6 / D12). The block set expands in M4.
const documentSectionSchema = z.object({
  title: z.string().min(1),
  blocks: z.array(blockSchema).min(1),
});

/**
 * `fillPlanSchema` — the LLM output the CLI fills from. **Not canonical**: a
 * throwaway draft input; the Office file is the deliverable. Discriminated on
 * `kind`: a deck's sections hold Slides, a document's sections hold blocks.
 */
export const fillPlanSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('deck'),
    meta: metaSchema,
    sections: z.array(deckSectionSchema).min(1).max(40),
    datasets: z.record(z.string(), datasetSchema).optional(),
  }),
  z.object({
    kind: z.literal('document'),
    meta: metaSchema,
    sections: z.array(documentSectionSchema).min(1).max(40),
    datasets: z.record(z.string(), datasetSchema).optional(),
  }),
]);

export type FillPlan = z.infer<typeof fillPlanSchema>;

export * from './brand.js';
export * from './chart.js';
export * from './slide.js';
export * from './block.js';

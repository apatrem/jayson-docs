import { z } from 'zod';
import { slideSchema } from './slide.js';
import { blockSchema } from './block.js';
import { datasetSchema, type ChartBlock } from './chart.js';

/**
 * Shared envelope metadata. `templateId` selects the master template; the
 * deliverable *type* (commercial proposal vs report) is implied by it.
 */
const metaSchema = z
  .object({
    templateId: z.string().min(1),
    client: z.string().min(1),
    date: z.string(),
    language: z.enum(['fr', 'en']),
  })
  .strict();

/**
 * Two-level body model (CONTEXT.md / DECISIONS_LOG D12). A **Section** is the
 * universal grouping unit (chapter / part); it feeds the tracker breadcrumb and
 * numbering and sits *above* the layout-bearing unit.
 *
 * Every object below is `.strict()` — unknown keys are rejected, not silently
 * stripped (Q6 / ERROR_HANDLING.md). This is what makes the schema "closed".
 */

// A deck section groups one or more Slides — each Slide picks a `layoutId`.
const deckSectionSchema = z
  .object({
    title: z.string().min(1),
    slides: z.array(slideSchema).min(1),
  })
  .strict();

// A document section groups blocks directly — no slide layer, no `layoutId`
// (Word reflows; see Q6 / D12). The block set expands post-v1.
const documentSectionSchema = z
  .object({
    title: z.string().min(1),
    blocks: z.array(blockSchema).min(1),
  })
  .strict();

/**
 * `fillPlanSchema` — the LLM output the CLI fills from. **Not canonical**: a
 * throwaway draft input; the Office file is the deliverable. Discriminated on
 * `kind`: a deck's sections hold Slides, a document's sections hold blocks.
 */
const fillPlanUnion = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('deck'),
      meta: metaSchema,
      sections: z.array(deckSectionSchema).min(1).max(40),
      datasets: z.record(z.string(), datasetSchema).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('document'),
      meta: metaSchema,
      sections: z.array(documentSectionSchema).min(1).max(40),
      datasets: z.record(z.string(), datasetSchema).optional(),
    })
    .strict(),
]);

type FillPlanInput = z.infer<typeof fillPlanUnion>;

/** Every chart block in the plan, with its location (for precise error paths). */
function collectCharts(plan: FillPlanInput): { chart: ChartBlock; path: (string | number)[] }[] {
  const found: { chart: ChartBlock; path: (string | number)[] }[] = [];
  if (plan.kind === 'deck') {
    plan.sections.forEach((section, si) => {
      section.slides.forEach((slide, li) => {
        if ('chart' in slide) {
          found.push({ chart: slide.chart, path: ['sections', si, 'slides', li, 'chart'] });
        }
      });
    });
  } else {
    plan.sections.forEach((section, si) => {
      section.blocks.forEach((block, bi) => {
        if (block.type === 'chart') {
          found.push({ chart: block.chart, path: ['sections', si, 'blocks', bi, 'chart'] });
        }
      });
    });
  }
  return found;
}

/**
 * Cross-field validation the per-object schemas can't do alone (D21 / Q6):
 *   - every chart `datasetRef` must resolve to a key in the plan's `datasets`;
 *   - a pie/doughnut chart's resolved dataset is capped at 8 rows.
 */
export const fillPlanSchema = fillPlanUnion.superRefine((plan, ctx) => {
  const datasets = plan.datasets ?? {};
  for (const { chart, path } of collectCharts(plan)) {
    if (chart.datasetRef !== undefined && !(chart.datasetRef in datasets)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'datasetRef'],
        message: `datasetRef "${chart.datasetRef}" not found in datasets`,
      });
    }
    const resolved =
      chart.dataset ?? (chart.datasetRef !== undefined ? datasets[chart.datasetRef] : undefined);
    if (resolved && (chart.kind === 'pie' || chart.kind === 'doughnut') && resolved.rows.length > 8) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'dataset', 'rows'],
        message: 'pie/doughnut charts allow at most 8 rows (CHART_CATALOGUE.md)',
      });
    }
  }
});

export type FillPlan = z.infer<typeof fillPlanSchema>;

export * from './brand.js';
export * from './chart.js';
export * from './slide.js';
export * from './block.js';

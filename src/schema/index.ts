import { z } from 'zod';
import { slideSchema } from './slide.js';
import { blockSchema } from './block.js';
import { datasetSchema, validateChartDataset, type ChartBlock } from './chart.js';

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

interface ChartReference {
  chart: ChartBlock;
  path: (string | number)[];
}

/**
 * `fillPlanSchema` — the LLM output the CLI fills from. **Not canonical**: a
 * throwaway draft input; the Office file is the deliverable. Discriminated on
 * `kind`: a deck's sections hold Slides, a document's sections hold blocks.
 */
const fillPlanBaseSchema = z.discriminatedUnion('kind', [
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

function collectChartReferences(plan: z.infer<typeof fillPlanBaseSchema>): ChartReference[] {
  const charts: ChartReference[] = [];

  if (plan.kind === 'deck') {
    plan.sections.forEach((section, sectionIndex) => {
      section.slides.forEach((slide, slideIndex) => {
        if (slide.layoutId === 'kpi-row-chart') {
          charts.push({
            chart: slide.chart,
            path: ['sections', sectionIndex, 'slides', slideIndex, 'chart'],
          });
        }
      });
    });

    return charts;
  }

  plan.sections.forEach((section, sectionIndex) => {
    section.blocks.forEach((block, blockIndex) => {
      if (block.type === 'chart') {
        charts.push({
          chart: block.chart,
          path: ['sections', sectionIndex, 'blocks', blockIndex, 'chart'],
        });
      }
    });
  });

  return charts;
}

export const fillPlanSchema = fillPlanBaseSchema.superRefine((plan, ctx) => {
  const datasets = plan.datasets ?? {};

  for (const { chart, path } of collectChartReferences(plan)) {
    if (chart.datasetRef === undefined) {
      continue;
    }

    const dataset = datasets[chart.datasetRef];
    if (dataset === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'datasetRef'],
        message: `datasetRef "${chart.datasetRef}" does not resolve in datasets`,
      });
      continue;
    }

    validateChartDataset(chart.kind, dataset, ctx, [...path, 'datasetRef']);
  }
});

export type FillPlan = z.infer<typeof fillPlanSchema>;

export * from './brand.js';
export * from './chart.js';
export * from './slide.js';
export * from './block.js';

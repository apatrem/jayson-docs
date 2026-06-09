import { z } from 'zod';
import { slideSchema, type Slide } from './slide.js';
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

function isChartBlock(value: unknown): value is ChartBlock {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.kind === 'string' && ('datasetRef' in record || 'dataset' in record);
}

function isContentChartWrapper(value: unknown): value is { kind: 'chart'; chart: ChartBlock } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return record.kind === 'chart' && isChartBlock(record.chart);
}

function walkSlideForCharts(
  slide: Slide,
  pathPrefix: (string | number)[],
  charts: ChartReference[],
): void {
  for (const [key, value] of Object.entries(slide)) {
    if (key === 'layoutId') {
      continue;
    }

    const path = [...pathPrefix, key];

    if (isChartBlock(value)) {
      charts.push({ chart: value, path });
      continue;
    }

    if (isContentChartWrapper(value)) {
      charts.push({ chart: value.chart, path: [...path, 'chart'] });
    }
  }
}

function collectChartReferences(plan: z.infer<typeof fillPlanBaseSchema>): ChartReference[] {
  const charts: ChartReference[] = [];

  if (plan.kind === 'deck') {
    plan.sections.forEach((section, sectionIndex) => {
      section.slides.forEach((slide, slideIndex) => {
        walkSlideForCharts(slide, [
          'sections',
          sectionIndex,
          'slides',
          slideIndex,
        ], charts);
      });
    });

    return charts;
  }

  return charts;
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

export const fillPlanSchema = fillPlanBaseSchema.superRefine((plan, ctx) => {
  const datasets = plan.datasets ?? {};

  for (const { chart, path } of collectChartReferences(plan)) {
    const dataset =
      chart.dataset ??
      (chart.datasetRef !== undefined ? datasets[chart.datasetRef] : undefined);

    if (dataset === undefined) {
      if (chart.datasetRef !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'datasetRef'],
          message: `datasetRef "${chart.datasetRef}" does not resolve in datasets`,
        });
      }
      continue;
    }

    const datasetPath =
      chart.dataset !== undefined ? [...path, 'dataset'] : [...path, 'datasetRef'];
    validateChartDataset(chart.kind, dataset, ctx, datasetPath);
  }
});

export type FillPlan = z.infer<typeof fillPlanSchema>;

export * from './brand.js';
export * from './chart.js';
export * from './slide.js';
export * from './block.js';

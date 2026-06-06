import { z } from 'zod';
import { slideSchema } from './slide.js';
import { blockSchema } from './block.js';
import {
  datasetSchema,
  pieDoughnutRowCountExceeded,
  type ChartKind,
} from './chart.js';

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

const fillPlanBodySchema = z.discriminatedUnion('kind', [
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

type FillPlanBody = z.infer<typeof fillPlanBodySchema>;

interface ChartRef {
  path: string;
  kind: ChartKind;
  datasetRef?: string | undefined;
  dataset?: z.infer<typeof datasetSchema> | undefined;
}

function collectChartRefs(plan: FillPlanBody): ChartRef[] {
  const refs: ChartRef[] = [];

  if (plan.kind === 'deck') {
    for (const [si, section] of plan.sections.entries()) {
      for (const [sli, slide] of section.slides.entries()) {
        if (slide.layoutId === 'kpi-row-chart') {
          refs.push({
            path: `sections[${si}].slides[${sli}].chart`,
            kind: slide.chart.kind,
            datasetRef: slide.chart.datasetRef,
            dataset: slide.chart.dataset,
          });
        }
      }
    }
    return refs;
  }

  for (const [si, section] of plan.sections.entries()) {
    for (const [bi, block] of section.blocks.entries()) {
      if (block.type === 'chart') {
        refs.push({
          path: `sections[${si}].blocks[${bi}].chart`,
          kind: block.chart.kind,
          datasetRef: block.chart.datasetRef,
          dataset: block.chart.dataset,
        });
      }
    }
  }

  return refs;
}

function crossValidateCharts(plan: FillPlanBody, ctx: z.RefinementCtx): void {
  const datasets = plan.datasets ?? {};

  for (const { path, kind, datasetRef, dataset } of collectChartRefs(plan)) {
    if (datasetRef !== undefined) {
      if (!(datasetRef in datasets)) {
        ctx.addIssue({
          code: 'custom',
          path: [...path.split('.'), 'datasetRef'],
          message: `datasetRef "${datasetRef}" does not resolve in datasets`,
        });
        continue;
      }
    }

    const resolved = dataset ?? (datasetRef !== undefined ? datasets[datasetRef] : undefined);
    if (resolved === undefined) {
      continue;
    }

    if (pieDoughnutRowCountExceeded(kind, resolved.rows.length)) {
      const datasetPath =
        dataset !== undefined ? `${path}.dataset.rows` : `datasets.${datasetRef}.rows`;
      ctx.addIssue({
        code: 'custom',
        path: datasetPath.split('.'),
        message: `pie/doughnut datasets must have at most 8 rows (got ${resolved.rows.length})`,
      });
    }
  }
}

/**
 * `fillPlanSchema` — the LLM output the CLI fills from. **Not canonical**: a
 * throwaway draft input; the Office file is the deliverable. Discriminated on
 * `kind`: a deck's sections hold Slides, a document's sections hold blocks.
 */
export const fillPlanSchema = fillPlanBodySchema.superRefine((plan, ctx) => {
  crossValidateCharts(plan, ctx);
});

export type FillPlan = z.infer<typeof fillPlanSchema>;

export * from './brand.js';
export * from './chart.js';
export * from './slide.js';
export * from './block.js';

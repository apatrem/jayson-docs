import { z } from 'zod';

/**
 * Reference chart kinds (CHART_CATALOGUE.md). In v1 (D21) only kinds **pinned
 * by an implemented layout slot** are valid — today `stacked-bar` on
 * `kpi-row-chart`. The LLM does not freely choose from this enum; layout
 * schemas pin `kind` to a literal. Adding a kind for a new layout requires:
 *   1. extend this enum if needed,
 *   2. extend per-kind validation below,
 *   3. document in CHART_CATALOGUE.md and pre-author in the master.
 */
export const chartKindSchema = z.enum([
  'bar',
  'stacked-bar',
  'line',
  'area',
  'pie',
  'doughnut',
  'scatter',
  'waterfall',
]);
export type ChartKind = z.infer<typeof chartKindSchema>;

const datasetRowSchema = z.array(z.union([z.string(), z.number(), z.null()]));

export const datasetSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    columns: z.array(z.string().min(1)).min(1),
    rows: z.array(datasetRowSchema).min(1),
  })
  .strict()
  .refine((d) => d.rows.every((r) => r.length === d.columns.length), {
    message: 'every row must have the same arity as columns',
  });

export type Dataset = z.infer<typeof datasetSchema>;

export function validateChartDataset(
  kind: ChartKind,
  dataset: Dataset,
  ctx: z.RefinementCtx,
  path: (string | number)[] = [],
): void {
  if ((kind === 'pie' || kind === 'doughnut') && dataset.rows.length > 8) {
    ctx.addIssue({
      code: 'custom',
      path,
      message: 'pie and doughnut charts support at most 8 rows',
    });
  }
}

interface ChartBlockInput {
  kind: ChartKind;
  datasetRef?: string | undefined;
  dataset?: Dataset | undefined;
  caption?: string | undefined;
}

function validateChartBlock(chart: ChartBlockInput, ctx: z.RefinementCtx): void {
  if (chart.datasetRef === undefined && chart.dataset === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['datasetRef'],
      message:
        'chart must reference a dataset (datasetRef) or include one inline (dataset). See CHART_CATALOGUE.md',
    });
  }

  if (chart.dataset !== undefined) {
    validateChartDataset(chart.kind, chart.dataset, ctx, ['dataset', 'rows']);
  }
}

export const chartBlockSchema = z
  .object({
    kind: chartKindSchema,
    datasetRef: z.string().min(1).optional(),
    dataset: datasetSchema.optional(),
    caption: z.string().max(120).optional(),
  })
  .strict()
  .superRefine(validateChartBlock);

export const stackedBarChartBlockSchema = z
  .object({
    kind: z.literal('stacked-bar'),
    datasetRef: z.string().min(1).optional(),
    dataset: datasetSchema.optional(),
    caption: z.string().max(120).optional(),
  })
  .strict()
  .superRefine(validateChartBlock);

export type ChartBlock = z.infer<typeof chartBlockSchema>;

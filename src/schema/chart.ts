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

const PIE_KINDS = new Set<ChartKind>(['pie', 'doughnut']);
export const PIE_DOUGHNUT_MAX_ROWS = 8;

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

const chartBlockObjectSchema = z
  .object({
    kind: chartKindSchema,
    datasetRef: z.string().min(1).optional(),
    dataset: datasetSchema.optional(),
    caption: z.string().max(120).optional(),
  })
  .strict();

const chartHasDataset = (c: z.infer<typeof chartBlockObjectSchema>): boolean =>
  c.datasetRef !== undefined || c.dataset !== undefined;

export const chartBlockSchema = chartBlockObjectSchema.refine(chartHasDataset, {
  message:
    'chart must reference a dataset (datasetRef) or include one inline (dataset). See CHART_CATALOGUE.md',
});

export type ChartBlock = z.infer<typeof chartBlockSchema>;

/** Layout slots pin `kind` to a single catalogue literal (D21). */
export function pinnedChartBlockSchema<K extends ChartKind>(kind: K) {
  return chartBlockObjectSchema
    .extend({ kind: z.literal(kind) })
    .refine(chartHasDataset, {
      message:
        'chart must reference a dataset (datasetRef) or include one inline (dataset). See CHART_CATALOGUE.md',
    });
}

export function pieDoughnutRowCountExceeded(kind: ChartKind, rowCount: number): boolean {
  return PIE_KINDS.has(kind) && rowCount > PIE_DOUGHNUT_MAX_ROWS;
}

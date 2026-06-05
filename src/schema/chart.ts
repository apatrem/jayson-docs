import { z } from 'zod';

/**
 * Approved chart types for v1. The JSON shape per kind is documented in
 * CHART_CATALOGUE.md (repo root). Adding a new kind requires:
 *   1. extend this enum,
 *   2. extend the per-kind validation below if it has structural requirements,
 *   3. document the shape in CHART_CATALOGUE.md.
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
  .refine((d) => d.rows.every((r) => r.length === d.columns.length), {
    message: 'every row must have the same arity as columns',
  });

export type Dataset = z.infer<typeof datasetSchema>;

export const chartBlockSchema = z
  .object({
    kind: chartKindSchema,
    datasetRef: z.string().min(1).optional(),
    dataset: datasetSchema.optional(),
    caption: z.string().max(120).optional(),
  })
  .refine((c) => c.datasetRef !== undefined || c.dataset !== undefined, {
    message:
      'chart must reference a dataset (datasetRef) or include one inline (dataset). See CHART_CATALOGUE.md',
  });

export type ChartBlock = z.infer<typeof chartBlockSchema>;

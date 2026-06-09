import { z } from 'zod';
import { REGION_CAPS } from './caps.js';

const captionMax = REGION_CAPS.caption.max;

/**
 * Reference chart kinds (CHART_CATALOGUE.md). In v1 (D21) only kinds **pinned
 * by an implemented layout slot** are valid. The LLM does not freely choose
 * from this enum; layout schemas pin `kind` to a literal.
 */
export const chartKindSchema = z.enum([
  'bar',
  'stacked-bar',
  'clustered-column',
  'line',
  'area',
  'pie',
  'doughnut',
  'scatter',
  'bubble',
  'waterfall',
]);
export type ChartKind = z.infer<typeof chartKindSchema>;

/** Categorical chart kinds — first column categories, remaining columns numeric series. */
export const categoricalChartKinds = [
  'bar',
  'stacked-bar',
  'clustered-column',
  'line',
  'area',
] as const satisfies readonly ChartKind[];

export type CategoricalChartKind = (typeof categoricalChartKinds)[number];

export const bubbleChartKind = 'bubble' as const satisfies ChartKind;

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

function isCategoricalKind(kind: ChartKind): kind is CategoricalChartKind {
  return (categoricalChartKinds as readonly string[]).includes(kind);
}

function validateCategoricalDataset(dataset: Dataset, ctx: z.RefinementCtx, path: (string | number)[]): void {
  if (dataset.columns.length < 2) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'columns'],
      message: 'categorical chart datasets need ≥2 columns (category + ≥1 series)',
    });
    return;
  }

  for (const [rowIndex, row] of dataset.rows.entries()) {
    const category = row[0];
    if (category !== null && typeof category !== 'string') {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'rows', rowIndex, 0],
        message: 'first column must be category labels (string)',
      });
    }

    for (let col = 1; col < row.length; col++) {
      const value = row[col];
      if (value !== null && typeof value !== 'number') {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'rows', rowIndex, col],
          message: 'series columns must be numeric',
        });
      }
    }
  }
}

function validateBubbleDataset(dataset: Dataset, ctx: z.RefinementCtx, path: (string | number)[]): void {
  const cols = dataset.columns.map((c) => c.toLowerCase());
  const hasSeries = cols.includes('series');
  const required = hasSeries ? ['series', 'x', 'y', 'size'] : ['x', 'y', 'size'];

  for (const name of required) {
    if (!cols.includes(name)) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, 'columns'],
        message: `bubble chart datasets require columns: ${required.join(', ')}`,
      });
      return;
    }
  }

  const xIdx = cols.indexOf('x');
  const yIdx = cols.indexOf('y');
  const sizeIdx = cols.indexOf('size');

  for (const [rowIndex, row] of dataset.rows.entries()) {
    for (const idx of [xIdx, yIdx, sizeIdx]) {
      const value = row[idx];
      if (value !== null && typeof value !== 'number') {
        ctx.addIssue({
          code: 'custom',
          path: [...path, 'rows', rowIndex, idx],
          message: 'bubble x, y, and size values must be numeric',
        });
      }
    }
  }
}

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

  if (kind === bubbleChartKind) {
    validateBubbleDataset(dataset, ctx, path);
    return;
  }

  if (isCategoricalKind(kind)) {
    validateCategoricalDataset(dataset, ctx, path);
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
}

/** Chart kinds pinned by implemented layout slots (D21). */
export const pinnedChartKinds = [
  'stacked-bar',
  'clustered-column',
  'line',
  'bubble',
] as const satisfies readonly ChartKind[];

export type PinnedChartKind = (typeof pinnedChartKinds)[number];

/**
 * Build a chart-block schema.
 *
 * v1 layout slots pin `kind` to a single catalogue literal (D21).
 * Inline dataset shape is validated once at fill-plan level (fillPlanSchema).
 */
export function chartBlock(opts: { kind: ChartKind }) {
  return z
    .object({
      kind: z.literal(opts.kind),
      datasetRef: z.string().min(1).optional(),
      dataset: datasetSchema.optional(),
      caption: z.string().max(captionMax).optional(),
    })
    .strict()
    .superRefine(validateChartBlock);
}

/** Union of layout-pinned chart blocks — the only constructible chart surface at runtime. */
export function pinnedChartBlockUnion() {
  return z.union([
    chartBlock({ kind: 'stacked-bar' }),
    chartBlock({ kind: 'clustered-column' }),
    chartBlock({ kind: 'line' }),
    chartBlock({ kind: 'bubble' }),
  ]);
}

export type ChartBlock = z.infer<ReturnType<typeof pinnedChartBlockUnion>>;

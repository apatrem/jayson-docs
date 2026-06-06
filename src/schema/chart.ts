import { z } from 'zod';

/**
 * Reference chart kinds (CHART_CATALOGUE.md). In v1 (D21) only kinds **pinned
 * by an implemented layout slot** are valid — today `stacked-bar` on
 * `kpi-row-chart`. The LLM does not freely choose from this enum; layout
 * schemas pin `kind` to a literal via `chartBlock({ kind })`. Adding a kind for
 * a new layout requires:
 *   1. extend this enum if needed,
 *   2. extend per-kind validation below,
 *   3. document in CHART_CATALOGUE.md and pre-author it in the master.
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

// pie/doughnut render one slice per row — capped per CHART_CATALOGUE.md.
const SINGLE_SLICE_KINDS: readonly ChartKind[] = ['pie', 'doughnut'];
export const MAX_PIE_ROWS = 8;

/**
 * Build a chart-block schema.
 *
 * v1 layouts pin `kind` to a literal (D21 corollary — the master pre-authors
 * that chart type and `pptx-automizer` swaps its data); omit `kind` for the
 * free enum (e.g. document chart blocks, or unit tests).
 *
 * Strict: unknown keys are **rejected** (Q6). Requires a `datasetRef` (resolved
 * against the fill-plan's `datasets` map — checked in `index.ts`) or an inline
 * `dataset`. Inline pie/doughnut datasets are capped at `MAX_PIE_ROWS` here;
 * `datasetRef`-resolved charts get the same cap in the fill-plan superRefine.
 */
export function chartBlock(opts?: { kind?: ChartKind }) {
  const kindSchema = opts?.kind ? z.literal(opts.kind) : chartKindSchema;
  return z
    .object({
      kind: kindSchema,
      datasetRef: z.string().min(1).optional(),
      dataset: datasetSchema.optional(),
      caption: z.string().max(120).optional(),
    })
    .strict()
    .refine((c) => c.datasetRef !== undefined || c.dataset !== undefined, {
      message:
        'chart must reference a dataset (datasetRef) or include one inline (dataset). See CHART_CATALOGUE.md',
    })
    .refine(
      (c) =>
        !SINGLE_SLICE_KINDS.includes(c.kind) ||
        c.dataset === undefined ||
        c.dataset.rows.length <= MAX_PIE_ROWS,
      { message: `pie/doughnut charts allow at most ${MAX_PIE_ROWS} rows (CHART_CATALOGUE.md)` },
    );
}

export const chartBlockSchema = chartBlock();
export type ChartBlock = z.infer<typeof chartBlockSchema>;

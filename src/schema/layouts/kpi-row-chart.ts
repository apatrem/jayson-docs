import { z } from 'zod';
import { chartBlock } from '../chart.js';

/**
 * Worked example layout — `kpi-row-chart`.
 *
 * Use this as the canonical pattern when adding the other layouts from
 * docs/SLIDE_LAYOUT_LIBRARY.md (two-column, chart-full-with-takeaway,
 * bullets-and-image, quad, section-divider).
 *
 * Density caps follow SLIDE_LAYOUT_LIBRARY.md exactly — do not relax them.
 * Every object is `.strict()`: the LLM cannot smuggle in unknown keys (Q6).
 */

// ─────────────────────────────────────────────────────────────────────────
// Word-count helpers
// ─────────────────────────────────────────────────────────────────────────
const wordCount = (s: string): number => s.split(/\s+/).filter(Boolean).length;

const titleString = z
  .string()
  .min(1)
  .refine((s) => {
    const n = wordCount(s);
    return n >= 8 && n <= 15;
  }, { message: 'title must be 8–15 words' });

// ─────────────────────────────────────────────────────────────────────────
// Block: kpi card
// ─────────────────────────────────────────────────────────────────────────
const kpiCardSchema = z
  .object({
    figure: z.string().min(1).max(15),
    label: z.string().min(1).max(40),
    delta: z.string().max(15).nullable().optional(),
  })
  .strict();

// ─────────────────────────────────────────────────────────────────────────
// Block: narrative (bullets | text)
// ─────────────────────────────────────────────────────────────────────────
const bulletsBlockSchema = z
  .object({
    kind: z.literal('bullets'),
    items: z.array(z.string().min(1).max(120)).min(1).max(5),
  })
  .strict()
  .refine((d) => wordCount(d.items.join(' ')) <= 60, {
    message: 'bullets exceed 60-word total cap',
  });

const textBlockSchema = z
  .object({
    kind: z.literal('text'),
    body: z
      .string()
      .min(1)
      .refine((s) => wordCount(s) <= 60, { message: 'text exceeds 60-word cap' }),
  })
  .strict();

// `z.union`, not `z.discriminatedUnion`: `bulletsBlockSchema` is `.refine()`d
// (a ZodEffects), which Zod cannot use as a discriminated-union member.
const narrativeSchema = z.union([bulletsBlockSchema, textBlockSchema]);

// ─────────────────────────────────────────────────────────────────────────
// Layout: kpi-row-chart
// ─────────────────────────────────────────────────────────────────────────
// The chart slot's type is fixed by the layout (D21 corollary): this slide
// pre-authors a `stacked-bar` in the master and pptx-automizer swaps its data —
// the LLM supplies data, never the chart type. Hence `kind` is pinned here.
export const kpiRowChartLayoutSchema = z
  .object({
    layoutId: z.literal('kpi-row-chart'),
    title: titleString,
    'kpi-strip': z.array(kpiCardSchema).min(3).max(5),
    chart: chartBlock({ kind: 'stacked-bar' }),
    narrative: narrativeSchema,
  })
  .strict();

export type KpiRowChartLayout = z.infer<typeof kpiRowChartLayoutSchema>;

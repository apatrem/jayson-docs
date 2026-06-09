import { z } from 'zod';
import { REGION_CAPS, wordCount } from '../caps.js';
import { chartBlock } from '../chart.js';

/**
 * Worked example layout — `kpi-row-chart`.
 *
 * Use this as the canonical pattern when adding the other layouts from
 * docs/SLIDE_LAYOUT_LIBRARY.md (two-column, chart-full-with-takeaway,
 * bullets-and-image, quad, section-divider).
 *
 * Density caps use two-tier model from caps.ts — Zod enforces absolute max only.
 */

const titleMax = REGION_CAPS.title.max;
const bulletsMax = REGION_CAPS['content-bullets'].max;
const contentTextMax = REGION_CAPS['content-text'].max;

const titleString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= titleMax, {
    message: `title must be ≤${titleMax} words`,
  });

const kpiCardSchema = z
  .object({
    figure: z.string().min(1).max(15),
    label: z.string().min(1).max(40),
    delta: z.string().max(15).nullable().optional(),
  })
  .strict();

const bulletsBlockSchema = z
  .object({
    kind: z.literal('bullets'),
    items: z.array(z.string().min(1).max(120)).min(1).max(bulletsMax.maxItems),
  })
  .strict()
  .refine((d) => wordCount(d.items.join(' ')) <= bulletsMax.maxWords, {
    message: `bullets exceed ${bulletsMax.maxWords}-word total cap`,
  });

const textBlockSchema = z
  .object({
    kind: z.literal('text'),
    body: z
      .string()
      .min(1)
      .refine((s) => wordCount(s) <= contentTextMax, {
        message: `text exceeds ${contentTextMax}-word cap`,
      }),
  })
  .strict();

const narrativeSchema = z.union([bulletsBlockSchema, textBlockSchema]);

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

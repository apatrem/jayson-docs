import { z } from 'zod';
import { chartBlock, pinnedChartBlockUnion, type PinnedChartKind } from '../chart.js';

/** Word-count helper — mirrors kpi-row-chart.ts. */
export const wordCount = (s: string): number => s.split(/\s+/).filter(Boolean).length;

/** Proposed cap: title region — 8–15 words (SLIDE_LAYOUT_LIBRARY.md). */
export const titleString = z
  .string()
  .min(1)
  .refine((s) => {
    const n = wordCount(s);
    return n >= 8 && n <= 15;
  }, { message: 'title must be 8–15 words' });

/** Proposed cap: section-title region — ≤8 words. */
export const sectionTitleString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= 8, { message: 'section-title must be ≤8 words' });

/** Proposed cap: chart-title region — ≤15 words (name + unit). */
export const chartTitleString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= 15, { message: 'chart-title must be ≤15 words' });

/** Proposed cap: source region — ≤40 words (citation line). */
export const sourceString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= 40, { message: 'source must be ≤40 words' });

/** Proposed cap: short single-line content (e.g. cover date/role) — ≤25 words. */
export const shortTextString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= 25, { message: 'text must be ≤25 words' });

/** Subtitle region — text or callout, ≤25 words. */
export const subtitleBlockSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('text'),
        body: z.string().min(1),
      })
      .strict(),
    z
      .object({
        kind: z.literal('callout'),
        body: z.string().min(1),
      })
      .strict(),
  ])
  .refine((d) => wordCount(d.body) <= 25, { message: 'subtitle must be ≤25 words' });

/** Content bullets — ≤5 items, ≤60 words total. */
export const contentBulletsSchema = z
  .object({
    kind: z.literal('bullets'),
    items: z.array(z.string().min(1).max(120)).min(1).max(5),
  })
  .strict()
  .refine((d) => wordCount(d.items.join(' ')) <= 60, {
    message: 'bullets exceed 60-word total cap',
  });

/** Content paragraph — ≤60 words. */
export const contentTextSchema = z
  .object({
    kind: z.literal('text'),
    body: z
      .string()
      .min(1)
      .refine((s) => wordCount(s) <= 60, { message: 'text exceeds 60-word cap' }),
  })
  .strict();

/** Content callout — ≤25 words. */
export const contentCalloutSchema = z
  .object({
    kind: z.literal('callout'),
    body: z
      .string()
      .min(1)
      .refine((s) => wordCount(s) <= 25, { message: 'callout exceeds 25-word cap' }),
  })
  .strict();

/** Image block for image / content regions. */
export const imageBlockSchema = z
  .object({
    kind: z.literal('image'),
    ref: z.string().min(1),
    caption: z.string().max(120).optional(),
  })
  .strict();

function contentChartBlock(kind?: PinnedChartKind) {
  return z
    .object({
      kind: z.literal('chart'),
      chart: kind !== undefined ? chartBlock({ kind }) : pinnedChartBlockUnion(),
    })
    .strict();
}

/** Content region — bullets, text, callout, image, or chart. */
export const contentBlockSchema = z.union([
  contentBulletsSchema,
  contentTextSchema,
  contentCalloutSchema,
  imageBlockSchema,
  contentChartBlock(),
]);

/** Chart narrative column (body-right) — bullets or text, same caps as kpi-row-chart narrative. */
export const narrativeBlockSchema = z.union([contentBulletsSchema, contentTextSchema]);

/** Cover / image slot. */
export const coverImageSchema = z
  .object({
    ref: z.string().min(1),
    caption: z.string().max(120).optional(),
  })
  .strict();

/** Build a pinned chart slot block for chart-bearing layouts (D21). */
export function pinnedChartSlot(kind: PinnedChartKind) {
  return chartBlock({ kind });
}

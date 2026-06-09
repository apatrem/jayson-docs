import { z } from 'zod';
import { REGION_CAPS, wordCount } from '../caps.js';
import { chartBlock, type PinnedChartKind } from '../chart.js';

export { wordCount } from '../caps.js';

const titleMax = REGION_CAPS.title.max;
const sectionTitleMax = REGION_CAPS['section-title'].max;
const chartTitleMax = REGION_CAPS['chart-title'].max;
const sourceMax = REGION_CAPS.source.max;
const coverBodyMax = REGION_CAPS['cover-body'].max;
const subtitleMax = REGION_CAPS.subtitle.max;
const bulletsMax = REGION_CAPS['content-bullets'].max;
const contentTextMax = REGION_CAPS['content-text'].max;
const contentCalloutMax = REGION_CAPS['content-callout'].max;
const captionMax = REGION_CAPS.caption.max;

/** Title region — absolute max enforced; optimal 8–15 words is CLI-warned only. */
export const titleString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= titleMax, {
    message: `title must be ≤${titleMax} words`,
  });

/** Section-title region — absolute max enforced. */
export const sectionTitleString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= sectionTitleMax, {
    message: `section-title must be ≤${sectionTitleMax} words`,
  });

/** Chart-title region — absolute max enforced. */
export const chartTitleString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= chartTitleMax, {
    message: `chart-title must be ≤${chartTitleMax} words`,
  });

/** Source region — absolute max enforced. */
export const sourceString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= sourceMax, { message: `source must be ≤${sourceMax} words` });

/** Cover body — absolute max enforced. */
export const shortTextString = z
  .string()
  .min(1)
  .refine((s) => wordCount(s) <= coverBodyMax, {
    message: `text must be ≤${coverBodyMax} words`,
  });

/** Subtitle region — text or callout, absolute max enforced. */
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
  .refine((d) => wordCount(d.body) <= subtitleMax, {
    message: `subtitle must be ≤${subtitleMax} words`,
  });

/** Content bullets — absolute max items and words enforced. */
export const contentBulletsSchema = z
  .object({
    kind: z.literal('bullets'),
    items: z.array(z.string().min(1).max(120)).min(1).max(bulletsMax.maxItems),
  })
  .strict()
  .refine((d) => wordCount(d.items.join(' ')) <= bulletsMax.maxWords, {
    message: `bullets exceed ${bulletsMax.maxWords}-word total cap`,
  });

/** Content paragraph — absolute max enforced. */
export const contentTextSchema = z
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

/** Content callout — absolute max enforced. */
export const contentCalloutSchema = z
  .object({
    kind: z.literal('callout'),
    body: z
      .string()
      .min(1)
      .refine((s) => wordCount(s) <= contentCalloutMax, {
        message: `callout exceeds ${contentCalloutMax}-word cap`,
      }),
  })
  .strict();

/** Image block for image / content regions. */
export const imageBlockSchema = z
  .object({
    kind: z.literal('image'),
    ref: z.string().min(1),
    caption: z.string().max(captionMax).optional(),
  })
  .strict();

/** Content region — bullets, text, callout, or image (no charts; D21 pins charts to chart slots only). */
export const contentBlockSchema = z.union([
  contentBulletsSchema,
  contentTextSchema,
  contentCalloutSchema,
  imageBlockSchema,
]);

/** Chart narrative column (body-right) — bullets or text, same caps as kpi-row-chart narrative. */
export const narrativeBlockSchema = z.union([contentBulletsSchema, contentTextSchema]);

/** Cover / image slot. */
export const coverImageSchema = z
  .object({
    ref: z.string().min(1),
    caption: z.string().max(captionMax).optional(),
  })
  .strict();

/** Build a pinned chart slot block for chart-bearing layouts (D21). */
export function pinnedChartSlot(kind: PinnedChartKind) {
  return chartBlock({ kind });
}

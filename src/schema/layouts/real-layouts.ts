import { z } from 'zod';
import {
  chartTitleString,
  contentBlockSchema,
  coverImageSchema,
  narrativeBlockSchema,
  pinnedChartSlot,
  sectionTitleString,
  shortTextString,
  sourceString,
  subtitleBlockSchema,
  titleString,
} from './shared.js';

// ── Cover family ────────────────────────────────────────────────────────────

const coverSlotsSchema = z
  .object({
    title: titleString,
    subtitle: subtitleBlockSchema,
    body: shortTextString,
    image: coverImageSchema,
  })
  .strict();

export const coverLayoutSchema = coverSlotsSchema.extend({
  layoutId: z.literal('cover'),
});

export const coverWhiteLayoutSchema = coverSlotsSchema.extend({
  layoutId: z.literal('cover-white'),
});

// ── Section family ────────────────────────────────────────────────────────────

const sectionSlotsSchema = z
  .object({
    'section-title': sectionTitleString,
    subtitle: subtitleBlockSchema,
  })
  .strict();

export const sectionLayoutSchema = sectionSlotsSchema.extend({
  layoutId: z.literal('section'),
});

export const sectionWhiteLayoutSchema = sectionSlotsSchema.extend({
  layoutId: z.literal('section-white'),
});

// ── Agenda family ─────────────────────────────────────────────────────────────

const agendaSlotsSchema = z
  .object({
    title: titleString,
    'body-left': contentBlockSchema,
  })
  .strict();

export const agendaLayoutSchema = agendaSlotsSchema.extend({
  layoutId: z.literal('agenda'),
});

export const agendaWhiteLayoutSchema = agendaSlotsSchema.extend({
  layoutId: z.literal('agenda-white'),
});

// ── Title + body + source ─────────────────────────────────────────────────────

const titleWithBodySourceSchema = z
  .object({
    title: titleString,
    'body-left': contentBlockSchema,
    source: sourceString,
  })
  .strict();

export const titleLayoutSchema = titleWithBodySourceSchema.extend({
  layoutId: z.literal('title'),
});

export const titleOnlyLayoutSchema = z
  .object({
    title: titleString,
    source: sourceString,
  })
  .strict()
  .extend({ layoutId: z.literal('title-only') });

export const titleAndSubtitleLayoutSchema = z
  .object({
    title: titleString,
    subtitle: subtitleBlockSchema,
    'body-left': contentBlockSchema,
    source: sourceString,
  })
  .strict()
  .extend({ layoutId: z.literal('title-and-subtitle') });

export const titleAndContentLayoutSchema = z
  .object({
    title: titleString,
    'body-left': contentBlockSchema,
  })
  .strict()
  .extend({ layoutId: z.literal('title-and-content') });

// ── Chart + narrative family (D21 pinned chart kind per layoutId) ─────────────

function chartLayoutSchema(
  layoutId: 'chart-stacked-column' | 'chart-clustered-column' | 'chart-line' | 'chart-bubble',
  chartKind: 'stacked-column' | 'clustered-column' | 'line' | 'bubble',
) {
  return z
    .object({
      layoutId: z.literal(layoutId),
      title: titleString,
      'chart-title': chartTitleString,
      chart: pinnedChartSlot(chartKind),
      'body-right': narrativeBlockSchema,
      source: sourceString,
    })
    .strict();
}

export const chartStackedColumnLayoutSchema = chartLayoutSchema(
  'chart-stacked-column',
  'stacked-column',
);
export const chartClusteredColumnLayoutSchema = chartLayoutSchema(
  'chart-clustered-column',
  'clustered-column',
);
export const chartLineLayoutSchema = chartLayoutSchema('chart-line', 'line');
export const chartBubbleLayoutSchema = chartLayoutSchema('chart-bubble', 'bubble');

// ── Two columns ───────────────────────────────────────────────────────────────

export const twoColumnsLayoutSchema = z
  .object({
    layoutId: z.literal('two-columns'),
    title: titleString,
    'body-left': contentBlockSchema,
    'body-right': contentBlockSchema,
    source: sourceString,
  })
  .strict();

// ── Narrative + sidebar ───────────────────────────────────────────────────────

const narrativeWithSidebarSlotsSchema = z
  .object({
    title: titleString,
    'subtitle-left': subtitleBlockSchema,
    'body-left': contentBlockSchema,
    'subtitle-right': subtitleBlockSchema,
    'body-right': contentBlockSchema,
    source: sourceString,
  })
  .strict();

export const narrativeWithSidebarLayoutSchema = narrativeWithSidebarSlotsSchema.extend({
  layoutId: z.literal('narrative-with-sidebar'),
});

export const narrativeWithSidebarHcLayoutSchema = narrativeWithSidebarSlotsSchema.extend({
  layoutId: z.literal('narrative-with-sidebar-hc'),
});

// ── Two column + subheads ─────────────────────────────────────────────────────

const twoColumnWithSubheadsSlotsSchema = z
  .object({
    title: titleString,
    'subtitle-left': subtitleBlockSchema,
    'body-left': contentBlockSchema,
    'subtitle-right': subtitleBlockSchema,
    'body-right': contentBlockSchema,
    source: sourceString,
  })
  .strict();

export const twoColumnWithSubheadsLayoutSchema = twoColumnWithSubheadsSlotsSchema.extend({
  layoutId: z.literal('two-column-with-subheads'),
});

export const twoColumnWithSubheadsHcLayoutSchema = twoColumnWithSubheadsSlotsSchema.extend({
  layoutId: z.literal('two-column-with-subheads-hc'),
});

export const twoColumnsAndSubtitlesLayoutSchema = twoColumnWithSubheadsSlotsSchema.extend({
  layoutId: z.literal('two-columns-and-subtitles'),
});

// ── Three columns + subtitles ─────────────────────────────────────────────────

export const threeColumnsAndSubtitlesLayoutSchema = z
  .object({
    layoutId: z.literal('three-columns-and-subtitles'),
    title: titleString,
    'subtitle-left': subtitleBlockSchema,
    'body-left': contentBlockSchema,
    'subtitle-middle': subtitleBlockSchema,
    'body-center': contentBlockSchema,
    'subtitle-right': subtitleBlockSchema,
    'body-right': contentBlockSchema,
    source: sourceString,
  })
  .strict();

// ── Sidebar callout (4 variants — identical slot set) ─────────────────────────

const sidebarCalloutSlotsSchema = z
  .object({
    title: titleString,
    'subtitle-1': subtitleBlockSchema,
    'subtitle-2': subtitleBlockSchema,
    body: contentBlockSchema,
    source: sourceString,
  })
  .strict();

export const sidebarCalloutLayoutSchema = sidebarCalloutSlotsSchema.extend({
  layoutId: z.literal('sidebar-callout'),
});

export const sidebarCalloutInverseLayoutSchema = sidebarCalloutSlotsSchema.extend({
  layoutId: z.literal('sidebar-callout-inverse'),
});

export const sidebarCalloutHcLayoutSchema = sidebarCalloutSlotsSchema.extend({
  layoutId: z.literal('sidebar-callout-hc'),
});

export const sidebarCalloutHcInverseLayoutSchema = sidebarCalloutSlotsSchema.extend({
  layoutId: z.literal('sidebar-callout-hc-inverse'),
});

// ── Blank ─────────────────────────────────────────────────────────────────────

export const blankLayoutSchema = z
  .object({
    layoutId: z.literal('blank'),
    source: sourceString,
  })
  .strict();

/** All 26 real-layout schemas from layout-spec.json (hand-written, not codegen). */
export const realLayoutSchemas = [
  coverLayoutSchema,
  sectionLayoutSchema,
  agendaLayoutSchema,
  titleLayoutSchema,
  titleOnlyLayoutSchema,
  titleAndSubtitleLayoutSchema,
  chartStackedColumnLayoutSchema,
  chartClusteredColumnLayoutSchema,
  chartLineLayoutSchema,
  chartBubbleLayoutSchema,
  twoColumnsLayoutSchema,
  narrativeWithSidebarLayoutSchema,
  twoColumnWithSubheadsLayoutSchema,
  sidebarCalloutLayoutSchema,
  threeColumnsAndSubtitlesLayoutSchema,
  titleAndContentLayoutSchema,
  twoColumnsAndSubtitlesLayoutSchema,
  blankLayoutSchema,
  coverWhiteLayoutSchema,
  sectionWhiteLayoutSchema,
  agendaWhiteLayoutSchema,
  sidebarCalloutInverseLayoutSchema,
  narrativeWithSidebarHcLayoutSchema,
  twoColumnWithSubheadsHcLayoutSchema,
  sidebarCalloutHcLayoutSchema,
  sidebarCalloutHcInverseLayoutSchema,
] as const;

export type RealLayout = z.infer<(typeof realLayoutSchemas)[number]>;

export const REAL_LAYOUT_IDS = realLayoutSchemas.map((s) => s.shape.layoutId.value) as [
  string,
  ...string[],
];

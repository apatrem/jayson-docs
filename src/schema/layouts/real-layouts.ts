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
  tableBlockSchema,
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

// ── Archetypes (D27 / T-211) ─────────────────────────────────────────────────

/** Big number — single hero statistic + caption (KPI collapsed to one metric). */
export const bigNumberLayoutSchema = z
  .object({
    layoutId: z.literal('big-number'),
    title: titleString,
    'big-number': contentBlockSchema,
    caption: subtitleBlockSchema,
    source: sourceString,
  })
  .strict();

// N-up sub-slotted families — per-item slots keyed `slot.<prefix>.<i>.<sub>`.
interface NupField {
  sub: string;
  schema: z.ZodTypeAny;
}

function nupShape(prefix: string, n: number, fields: NupField[]): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (let i = 1; i <= n; i += 1) {
    for (const { sub, schema } of fields) {
      shape[`${prefix}.${i}.${sub}`] = schema;
    }
  }
  return shape;
}

function nupLayoutSchema<T extends string>(layoutId: T, prefix: string, n: number, fields: NupField[]) {
  return z
    .object({
      layoutId: z.literal(layoutId),
      title: titleString,
      ...nupShape(prefix, n, fields),
      source: sourceString,
    })
    .strict();
}

const titleBodyFields: NupField[] = [
  { sub: 'title', schema: subtitleBlockSchema },
  { sub: 'body', schema: contentBlockSchema },
];
const kpiFields: NupField[] = [
  { sub: 'value', schema: subtitleBlockSchema },
  { sub: 'label', schema: subtitleBlockSchema },
  { sub: 'body', schema: contentBlockSchema },
];
const roadmapFields: NupField[] = [
  { sub: 'caption', schema: subtitleBlockSchema },
  { sub: 'title', schema: subtitleBlockSchema },
  { sub: 'body', schema: contentBlockSchema },
];

export const process3LayoutSchema = nupLayoutSchema('process-3', 'process-step', 3, titleBodyFields);
export const process4LayoutSchema = nupLayoutSchema('process-4', 'process-step', 4, titleBodyFields);
export const process5LayoutSchema = nupLayoutSchema('process-5', 'process-step', 5, titleBodyFields);
export const kpi3LayoutSchema = nupLayoutSchema('kpi-3', 'kpi', 3, kpiFields);
export const kpi4LayoutSchema = nupLayoutSchema('kpi-4', 'kpi', 4, kpiFields);
export const kpi5LayoutSchema = nupLayoutSchema('kpi-5', 'kpi', 5, kpiFields);
export const funnel3LayoutSchema = nupLayoutSchema('funnel-3', 'funnel-stage', 3, titleBodyFields);
export const funnel4LayoutSchema = nupLayoutSchema('funnel-4', 'funnel-stage', 4, titleBodyFields);
export const funnel5LayoutSchema = nupLayoutSchema('funnel-5', 'funnel-stage', 5, titleBodyFields);
export const featureGrid3LayoutSchema = nupLayoutSchema('feature-grid-3', 'feature', 3, titleBodyFields);
export const featureGrid4LayoutSchema = nupLayoutSchema('feature-grid-4', 'feature', 4, titleBodyFields);
export const featureGrid5LayoutSchema = nupLayoutSchema('feature-grid-5', 'feature', 5, titleBodyFields);
export const roadmap3LayoutSchema = nupLayoutSchema('roadmap-3', 'phase', 3, roadmapFields);
export const roadmap4LayoutSchema = nupLayoutSchema('roadmap-4', 'phase', 4, roadmapFields);
export const roadmap5LayoutSchema = nupLayoutSchema('roadmap-5', 'phase', 5, roadmapFields);

// Singleton archetypes (value-chain / gantt / matrix / quote).
export const valueChainLayoutSchema = z
  .object({
    layoutId: z.literal('value-chain'),
    title: titleString,
    'value-chain.source': subtitleBlockSchema,
    ...nupShape('value-chain.stage', 5, [{ sub: 'title', schema: subtitleBlockSchema }]),
    'value-chain.customer': subtitleBlockSchema,
    'value-chain.body': contentBlockSchema,
    source: sourceString,
  })
  .strict();

export const ganttLayoutSchema = z
  .object({
    layoutId: z.literal('gantt'),
    title: titleString,
    ...nupShape('gantt.lane', 4, [
      { sub: 'label', schema: subtitleBlockSchema },
      { sub: 'body', schema: contentBlockSchema },
    ]),
    source: sourceString,
  })
  .strict();

export const matrix2x2LayoutSchema = z
  .object({
    layoutId: z.literal('matrix-2x2'),
    title: titleString,
    'matrix.axis-x': subtitleBlockSchema,
    'matrix.axis-y': subtitleBlockSchema,
    ...nupShape('matrix.quadrant', 4, [
      { sub: 'title', schema: subtitleBlockSchema },
      { sub: 'body', schema: contentBlockSchema },
    ]),
    source: sourceString,
  })
  .strict();

export const matrix9boxLayoutSchema = z
  .object({
    layoutId: z.literal('matrix-9box'),
    title: titleString,
    'matrix.axis-x': subtitleBlockSchema,
    'matrix.axis-y': subtitleBlockSchema,
    ...nupShape('matrix.cell', 9, [{ sub: 'title', schema: subtitleBlockSchema }]),
    source: sourceString,
  })
  .strict();

export const quoteLayoutSchema = z
  .object({
    layoutId: z.literal('quote'),
    title: titleString,
    quote: contentBlockSchema,
    attribution: subtitleBlockSchema,
    source: sourceString,
  })
  .strict();

// Table archetypes (D27 / T-211; fill mechanism + per-variant contracts → T-210/T-213).
function tableLayoutSchema<T extends string>(layoutId: T) {
  return z
    .object({
      layoutId: z.literal(layoutId),
      title: titleString,
      table: tableBlockSchema,
      source: sourceString,
    })
    .strict();
}

export const tableRagLayoutSchema = tableLayoutSchema('table-rag');
export const tableComparisonLayoutSchema = tableLayoutSchema('table-comparison');
export const tableGenericLayoutSchema = tableLayoutSchema('table-generic');

/** All real-layout schemas from layout-spec.json (hand-written, not codegen). */
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
  bigNumberLayoutSchema,
  process3LayoutSchema,
  process4LayoutSchema,
  process5LayoutSchema,
  kpi3LayoutSchema,
  kpi4LayoutSchema,
  kpi5LayoutSchema,
  funnel3LayoutSchema,
  funnel4LayoutSchema,
  funnel5LayoutSchema,
  featureGrid3LayoutSchema,
  featureGrid4LayoutSchema,
  featureGrid5LayoutSchema,
  roadmap3LayoutSchema,
  roadmap4LayoutSchema,
  roadmap5LayoutSchema,
  valueChainLayoutSchema,
  ganttLayoutSchema,
  matrix2x2LayoutSchema,
  matrix9boxLayoutSchema,
  quoteLayoutSchema,
  tableRagLayoutSchema,
  tableComparisonLayoutSchema,
  tableGenericLayoutSchema,
] as const;

export type RealLayout = z.infer<(typeof realLayoutSchemas)[number]>;

export const REAL_LAYOUT_IDS = realLayoutSchemas.map((s) => s.shape.layoutId.value) as [
  string,
  ...string[],
];

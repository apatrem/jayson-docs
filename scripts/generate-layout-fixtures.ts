#!/usr/bin/env tsx
/** One-off generator for minimal valid layout fixtures (Phase 3.6 coverage). */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REAL_LAYOUT_IDS } from '../src/schema/layouts/real-layouts.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const meta = {
  templateId: 'report.master.pptx',
  client: 'ACME',
  date: '2026-06-08',
  language: 'en' as const,
};
const title = 'Eight word minimum title for every layout fixture test';
const source = 'Source: ACME analysis, June 2026.';
const subtitle = { kind: 'text' as const, body: 'Short subtitle for column' };
const bullets = { kind: 'bullets' as const, items: ['Point one', 'Point two'] };
const text = { kind: 'text' as const, body: 'Short narrative body text for the slot.' };
const datasets = {
  cat: {
    id: 'cat',
    columns: ['category', 'series_a'],
    rows: [
      ['A', 10],
      ['B', 20],
    ],
  },
  line: {
    id: 'line',
    columns: ['year', 'value'],
    rows: [
      [2024, 10],
      [2025, 20],
    ],
  },
  bubble: {
    id: 'bubble',
    columns: ['x', 'y', 'size'],
    rows: [
      [1, 2, 3],
      [4, 5, 6],
    ],
  },
};

const slides: Record<string, Record<string, unknown>> = {
  cover: {
    layoutId: 'cover',
    title,
    subtitle,
    body: 'June 2026 · Partner presentation',
    image: { ref: 'fixtures/assets/test-logo.svg' },
  },
  section: {
    layoutId: 'section',
    'section-title': 'Section One',
    subtitle,
  },
  agenda: { layoutId: 'agenda', title, 'body-left': bullets },
  title: { layoutId: 'title', title, 'body-left': bullets, source },
  'title-only': { layoutId: 'title-only', title, source },
  'title-and-subtitle': {
    layoutId: 'title-and-subtitle',
    title,
    subtitle,
    'body-left': bullets,
    source,
  },
  'chart-stacked-column': {
    layoutId: 'chart-stacked-column',
    title,
    'chart-title': 'Units by category',
    chart: { kind: 'stacked-column', datasetRef: 'cat' },
    'body-right': bullets,
    source,
  },
  'chart-clustered-column': {
    layoutId: 'chart-clustered-column',
    title,
    'chart-title': 'Units by category',
    chart: { kind: 'clustered-column', datasetRef: 'cat' },
    'body-right': bullets,
    source,
  },
  'chart-line': {
    layoutId: 'chart-line',
    title,
    'chart-title': 'Trend over time',
    chart: { kind: 'line', datasetRef: 'line' },
    'body-right': text,
    source,
  },
  'chart-bubble': {
    layoutId: 'chart-bubble',
    title,
    'chart-title': 'Risk return map',
    chart: { kind: 'bubble', datasetRef: 'bubble' },
    'body-right': text,
    source,
  },
  'two-columns': {
    layoutId: 'two-columns',
    title,
    'body-left': bullets,
    'body-right': bullets,
    source,
  },
  'narrative-with-sidebar': {
    layoutId: 'narrative-with-sidebar',
    title,
    'subtitle-left': subtitle,
    'body-left': bullets,
    'subtitle-right': subtitle,
    'body-right': text,
    source,
  },
  'two-column-with-subheads': {
    layoutId: 'two-column-with-subheads',
    title,
    'subtitle-left': subtitle,
    'body-left': bullets,
    'subtitle-right': subtitle,
    'body-right': bullets,
    source,
  },
  'sidebar-callout': {
    layoutId: 'sidebar-callout',
    title,
    'subtitle-1': subtitle,
    'subtitle-2': subtitle,
    body: bullets,
    source,
  },
  'three-columns-and-subtitles': {
    layoutId: 'three-columns-and-subtitles',
    title,
    'subtitle-left': subtitle,
    'body-left': bullets,
    'subtitle-middle': subtitle,
    'body-center': text,
    'subtitle-right': subtitle,
    'body-right': bullets,
    source,
  },
  'title-and-content': { layoutId: 'title-and-content', title, 'body-left': bullets },
  'two-columns-and-subtitles': {
    layoutId: 'two-columns-and-subtitles',
    title,
    'subtitle-left': subtitle,
    'body-left': bullets,
    'subtitle-right': subtitle,
    'body-right': bullets,
    source,
  },
  blank: { layoutId: 'blank', source },
  'cover-white': {
    layoutId: 'cover-white',
    title,
    subtitle,
    body: 'June 2026 · Partner presentation',
    image: { ref: 'fixtures/assets/test-logo.svg' },
  },
  'section-white': {
    layoutId: 'section-white',
    'section-title': 'Section One',
    subtitle,
  },
  'agenda-white': { layoutId: 'agenda-white', title, 'body-left': bullets },
  'sidebar-callout-inverse': {
    layoutId: 'sidebar-callout-inverse',
    title,
    'subtitle-1': subtitle,
    'subtitle-2': subtitle,
    body: bullets,
    source,
  },
  'narrative-with-sidebar-hc': {
    layoutId: 'narrative-with-sidebar-hc',
    title,
    'subtitle-left': subtitle,
    'body-left': bullets,
    'subtitle-right': subtitle,
    'body-right': text,
    source,
  },
  'two-column-with-subheads-hc': {
    layoutId: 'two-column-with-subheads-hc',
    title,
    'subtitle-left': subtitle,
    'body-left': bullets,
    'subtitle-right': subtitle,
    'body-right': bullets,
    source,
  },
  'sidebar-callout-hc': {
    layoutId: 'sidebar-callout-hc',
    title,
    'subtitle-1': subtitle,
    'subtitle-2': subtitle,
    body: bullets,
    source,
  },
  'sidebar-callout-hc-inverse': {
    layoutId: 'sidebar-callout-hc-inverse',
    title,
    'subtitle-1': subtitle,
    'subtitle-2': subtitle,
    body: bullets,
    source,
  },
  'big-number': {
    layoutId: 'big-number',
    title,
    'big-number': { kind: 'text', body: '€43M' },
    caption: subtitle,
    source,
  },
};

// N-up sub-slotted families (process / kpi / funnel / feature-grid / roadmap).
const nupFamilies = [
  { prefix: 'process-step', family: 'process', fields: [{ sub: 'title', value: subtitle }, { sub: 'body', value: bullets }] },
  { prefix: 'kpi', family: 'kpi', fields: [{ sub: 'value', value: subtitle }, { sub: 'label', value: subtitle }, { sub: 'body', value: text }] },
  { prefix: 'funnel-stage', family: 'funnel', fields: [{ sub: 'title', value: subtitle }, { sub: 'body', value: text }] },
  { prefix: 'feature', family: 'feature-grid', fields: [{ sub: 'title', value: subtitle }, { sub: 'body', value: bullets }] },
  { prefix: 'phase', family: 'roadmap', fields: [{ sub: 'caption', value: subtitle }, { sub: 'title', value: subtitle }, { sub: 'body', value: bullets }] },
];
for (const { prefix, family, fields } of nupFamilies) {
  for (const n of [3, 4, 5]) {
    const id = `${family}-${n}`;
    const slot: Record<string, unknown> = { layoutId: id, title };
    for (let i = 1; i <= n; i += 1) {
      for (const f of fields) {
        slot[`${prefix}.${i}.${f.sub}`] = f.value;
      }
    }
    slot.source = source;
    slides[id] = slot;
  }
}

slides['value-chain'] = (() => {
  const s: Record<string, unknown> = { layoutId: 'value-chain', title, 'value-chain.source': subtitle };
  for (let i = 1; i <= 5; i += 1) s[`value-chain.stage.${i}.title`] = subtitle;
  s['value-chain.customer'] = subtitle;
  s['value-chain.body'] = bullets;
  s.source = source;
  return s;
})();
slides.gantt = (() => {
  const s: Record<string, unknown> = { layoutId: 'gantt', title };
  for (let i = 1; i <= 4; i += 1) {
    s[`gantt.lane.${i}.label`] = subtitle;
    s[`gantt.lane.${i}.body`] = text;
  }
  s.source = source;
  return s;
})();
slides['matrix-2x2'] = (() => {
  const s: Record<string, unknown> = { layoutId: 'matrix-2x2', title, 'matrix.axis-x': subtitle, 'matrix.axis-y': subtitle };
  for (let i = 1; i <= 4; i += 1) {
    s[`matrix.quadrant.${i}.title`] = subtitle;
    s[`matrix.quadrant.${i}.body`] = bullets;
  }
  s.source = source;
  return s;
})();
slides['matrix-9box'] = (() => {
  const s: Record<string, unknown> = { layoutId: 'matrix-9box', title, 'matrix.axis-x': subtitle, 'matrix.axis-y': subtitle };
  for (let i = 1; i <= 9; i += 1) s[`matrix.cell.${i}.title`] = subtitle;
  s.source = source;
  return s;
})();
slides.quote = { layoutId: 'quote', title, quote: text, attribution: subtitle, source };

const tableBlock = {
  kind: 'table' as const,
  columns: ['Criterion', 'Option A', 'Option B', 'Status'],
  rows: [
    ['Cost', 'High', 'Low', 'Amber'],
    ['Speed', 'Fast', 'Slow', 'Green'],
  ],
};
slides['table-rag'] = { layoutId: 'table-rag', title, table: tableBlock, source };
slides['table-comparison'] = { layoutId: 'table-comparison', title, table: tableBlock, source };
slides['table-generic'] = { layoutId: 'table-generic', title, table: tableBlock, source };

for (const id of REAL_LAYOUT_IDS) {
  const slide = slides[id];
  if (slide === undefined) {
    throw new Error(`missing slide template for ${id}`);
  }
  const plan = {
    kind: 'deck',
    meta,
    datasets: id.startsWith('chart-') ? datasets : undefined,
    sections: [{ title: 'Fixture', slides: [slide] }],
  };
  const file = join(root, 'fixtures/layouts', `valid-${id}.json`);
  writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`);
  process.stdout.write(`wrote ${file}\n`);
}

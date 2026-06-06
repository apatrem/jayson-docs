import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema, chartBlock } from '../src/schema/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf-8'));

describe('fillPlanSchema', () => {
  it('accepts the valid deck fill-plan fixture', () => {
    expect(fillPlanSchema.safeParse(read('fixtures/valid-fill-plan.json')).success).toBe(true);
  });

  it.each([
    'fixtures/invalid/fillplan-title-too-short.json',
    'fixtures/invalid/fillplan-too-many-kpis.json',
    'fixtures/invalid/fillplan-unknown-layout.json',
    'fixtures/invalid/fillplan-unknown-chart-kind.json',
    'fixtures/invalid/fillplan-unknown-key.json',
    'fixtures/invalid/fillplan-bad-datasetref.json',
    'fixtures/invalid/fillplan-chart-kind-mismatch.json',
  ])('rejects %s', (path) => {
    expect(fillPlanSchema.safeParse(read(path)).success).toBe(false);
  });

  it('rejects an unknown kind (closed discriminator)', () => {
    expect(
      fillPlanSchema.safeParse({ kind: 'memo', meta: {}, sections: [] }).success,
    ).toBe(false);
  });

  it('accepts a minimal document fill-plan (sections of blocks, no layoutId)', () => {
    const plan = {
      kind: 'document',
      meta: { templateId: 'report.master.docx', client: 'ACME', date: '2026-06-04', language: 'fr' },
      sections: [
        {
          title: 'Executive summary',
          blocks: [
            { type: 'heading', level: 1, text: 'Summary' },
            { type: 'paragraph', text: 'Findings in brief.' },
            { type: 'bullets', items: ['First point', 'Second point'] },
          ],
        },
      ],
    };
    expect(fillPlanSchema.safeParse(plan).success).toBe(true);
  });

  it('accepts a deck whose chart carries an inline dataset (no datasetRef)', () => {
    const plan = {
      kind: 'deck',
      meta: { templateId: 'report.master.pptx', client: 'ACME', date: '2026-06-04', language: 'en' },
      sections: [
        {
          title: 'Findings',
          slides: [
            {
              layoutId: 'kpi-row-chart',
              title: 'Tier-1 candidates score well on bankable long-term demand here',
              'kpi-strip': [
                { figure: '2.4x', label: 'demand vs ammonia' },
                { figure: '68', label: 'LCOE' },
                { figure: '7', label: 'offtakers' },
              ],
              chart: { kind: 'stacked-bar', dataset: { id: 'inline', columns: ['x', 'y'], rows: [['a', 1], ['b', 2]] } },
              narrative: { kind: 'bullets', items: ['One point here.'] },
            },
          ],
        },
      ],
    };
    expect(fillPlanSchema.safeParse(plan).success).toBe(true);
  });
});

describe('chartBlock — strictness, pinned kind, density', () => {
  const rows = (n: number): (string | number)[][] =>
    Array.from({ length: n }, (_, i) => [`slice ${i}`, i]);
  const dataset = (n: number) => ({ id: 'd', columns: ['label', 'value'], rows: rows(n) });

  it('rejects an unknown key (strict)', () => {
    expect(chartBlock().safeParse({ kind: 'bar', datasetRef: 'd', bogus: 1 }).success).toBe(false);
  });

  it('requires a datasetRef or an inline dataset', () => {
    expect(chartBlock().safeParse({ kind: 'bar' }).success).toBe(false);
    expect(chartBlock().safeParse({ kind: 'bar', datasetRef: 'd' }).success).toBe(true);
  });

  it('pins kind when a layout requests it', () => {
    const pinned = chartBlock({ kind: 'stacked-bar' });
    expect(pinned.safeParse({ kind: 'stacked-bar', datasetRef: 'd' }).success).toBe(true);
    expect(pinned.safeParse({ kind: 'bar', datasetRef: 'd' }).success).toBe(false);
  });

  it('caps pie/doughnut at 8 inline rows (CHART_CATALOGUE.md)', () => {
    expect(chartBlock().safeParse({ kind: 'pie', dataset: dataset(8) }).success).toBe(true);
    expect(chartBlock().safeParse({ kind: 'pie', dataset: dataset(9) }).success).toBe(false);
    expect(chartBlock().safeParse({ kind: 'doughnut', dataset: dataset(9) }).success).toBe(false);
    // the cap is pie/doughnut-only — a 9-row bar is fine
    expect(chartBlock().safeParse({ kind: 'bar', dataset: dataset(9) }).success).toBe(true);
  });
});

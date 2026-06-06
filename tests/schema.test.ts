import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema } from '../src/schema/index.js';

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
    'fixtures/invalid/fillplan-bad-dataset-ref.json',
    'fixtures/invalid/fillplan-chart-kind-mismatch.json',
    'fixtures/invalid/fillplan-pie-too-many-rows.json',
  ])('rejects %s', (path) => {
    expect(fillPlanSchema.safeParse(read(path)).success).toBe(false);
  });

  it('rejects unknown keys on section objects (strict)', () => {
    const plan = read('fixtures/valid-fill-plan.json') as Record<string, unknown>;
    const sections = (plan.sections as Record<string, unknown>[]).map((s) => ({
      ...s,
      rogueKey: true,
    }));
    expect(fillPlanSchema.safeParse({ ...plan, sections }).success).toBe(false);
  });

  it('rejects datasetRef that does not resolve in datasets', () => {
    const plan = read('fixtures/valid-fill-plan.json') as {
      kind: string;
      meta: unknown;
      sections: { slides: Record<string, unknown>[] }[];
      datasets?: Record<string, unknown>;
    };
    const slide = plan.sections[0]?.slides[0] ?? {};
    const chart = { ...(slide.chart as Record<string, unknown>), datasetRef: 'ghost_key' };
    const sections = [
      {
        ...plan.sections[0],
        slides: [{ ...slide, chart }],
      },
    ];
    expect(
      fillPlanSchema.safeParse({ kind: plan.kind, meta: plan.meta, sections, datasets: plan.datasets })
        .success,
    ).toBe(false);
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
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema } from '../src/schema/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf-8'));

const invalidFixturePaths = [
  'fixtures/invalid/fillplan-title-over-max.json',
  'fixtures/invalid/fillplan-too-many-kpis.json',
  'fixtures/invalid/fillplan-unknown-layout.json',
  'fixtures/invalid/fillplan-unknown-chart-kind.json',
  'fixtures/invalid/fillplan-unknown-key.json',
  'fixtures/invalid/fillplan-bad-dataset-ref.json',
  'fixtures/invalid/fillplan-pie-too-many-rows.json',
  'fixtures/invalid/fillplan-chart-kind-mismatch.json',
] as const;

const issuePath = (path: (string | number | symbol)[]): string => path.join('.');

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expected JSON object');
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('expected JSON array');
  }

  return value;
}

function firstDeckSection(plan: unknown): Record<string, unknown> {
  return asRecord(asArray(asRecord(plan).sections)[0]);
}

function firstDeckSlide(plan: unknown): Record<string, unknown> {
  return asRecord(asArray(firstDeckSection(plan).slides)[0]);
}

describe('fillPlanSchema', () => {
  it('accepts the valid deck fill-plan fixture', () => {
    expect(fillPlanSchema.safeParse(read('fixtures/valid-fill-plan.json')).success).toBe(true);
  });

  it.each(invalidFixturePaths)('rejects %s', (path) => {
    expect(fillPlanSchema.safeParse(read(path)).success).toBe(false);
  });

  it('rejects unknown keys on fill-plan objects', () => {
    const result = fillPlanSchema.safeParse(read('fixtures/invalid/fillplan-unknown-key.json'));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issue.code === 'unrecognized_keys' && issuePath(issue.path) === 'sections.0.slides.0',
        ),
      ).toBe(true);
    }
  });

  it('rejects unknown keys on sections, slides, blocks, and charts', () => {
    const sectionPlan = read('fixtures/valid-fill-plan.json');
    firstDeckSection(sectionPlan).unexpected = true;
    expect(fillPlanSchema.safeParse(sectionPlan).success).toBe(false);

    const slidePlan = read('fixtures/valid-fill-plan.json');
    firstDeckSlide(slidePlan).unexpected = true;
    expect(fillPlanSchema.safeParse(slidePlan).success).toBe(false);

    const blockPlan = {
      kind: 'document',
      meta: {
        templateId: 'report.master.docx',
        client: 'ACME',
        date: '2026-06-04',
        language: 'en',
      },
      sections: [
        {
          title: 'Findings',
          blocks: [{ type: 'paragraph', text: 'Findings in brief.', unexpected: true }],
        },
      ],
    };
    expect(fillPlanSchema.safeParse(blockPlan).success).toBe(false);

    const chartPlan = read('fixtures/valid-fill-plan.json');
    asRecord(firstDeckSlide(chartPlan).chart).unexpected = true;
    expect(fillPlanSchema.safeParse(chartPlan).success).toBe(false);
  });

  it('rejects chart datasetRef values that do not resolve in datasets', () => {
    const result = fillPlanSchema.safeParse(read('fixtures/invalid/fillplan-bad-dataset-ref.json'));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issuePath(issue.path) === 'sections.0.slides.0.chart.datasetRef' &&
            issue.message.includes('does not resolve in datasets'),
        ),
      ).toBe(true);
    }
  });

  it('rejects unpinned chart kinds in document chart blocks', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-pie-too-many-rows.json'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issuePath(issue.path) === 'sections.0.blocks.0.chart' &&
            issue.code === 'invalid_union',
        ),
      ).toBe(true);
    }
  });

  it('reports a single validation error for a malformed inline chart dataset', () => {
    const plan = {
      kind: 'deck',
      meta: {
        templateId: 'report.master.pptx',
        client: 'ACME',
        date: '2026-06-04',
        language: 'en',
      },
      sections: [
        {
          title: 'Findings',
          slides: [
            {
              layoutId: 'kpi-row-chart',
              title: 'Tier-1 candidates score better than ammonia across every demand scenario today',
              'kpi-strip': [
                { figure: '1', label: 'a' },
                { figure: '2', label: 'b' },
                { figure: '3', label: 'c' },
              ],
              chart: {
                kind: 'stacked-bar',
                dataset: {
                  id: 'inline_bad',
                  columns: ['industry', 'low'],
                  rows: [[42, 'not-a-number']],
                },
              },
              narrative: { kind: 'text', body: 'short narrative under sixty words.' },
            },
          ],
        },
      ],
    };

    const result = fillPlanSchema.safeParse(plan);

    expect(result.success).toBe(false);
    if (!result.success) {
      const categoryIssues = result.error.issues.filter((issue) =>
        issue.message.includes('first column must be category labels'),
      );
      expect(categoryIssues).toHaveLength(1);
    }
  });

  it('rejects chart kind mismatches against the layout-pinned literal', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-chart-kind-mismatch.json'),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issuePath(issue.path) === 'sections.0.slides.0.chart.kind',
        ),
      ).toBe(true);
    }
  });

  it('rejects an unknown kind (closed discriminator)', () => {
    expect(fillPlanSchema.safeParse({ kind: 'memo', meta: {}, sections: [] }).success).toBe(false);
  });

  it('accepts a minimal document fill-plan (sections of blocks, no layoutId)', () => {
    const plan = {
      kind: 'document',
      meta: {
        templateId: 'report.master.docx',
        client: 'ACME',
        date: '2026-06-04',
        language: 'fr',
      },
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

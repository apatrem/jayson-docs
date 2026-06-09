import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema } from '../src/schema/index.js';
import { REAL_LAYOUT_IDS, realLayoutSchemas } from '../src/schema/layouts/real-layouts.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf-8'));

const validLayoutFixtures = readdirSync(resolve(root, 'fixtures/layouts'))
  .filter((f) => f.startsWith('valid-') && f.endsWith('.json'))
  .map((f) => `fixtures/layouts/${f}`);

const newInvalidFixtures = [
  'fixtures/invalid/fillplan-real-layout-unknown-key.json',
  'fixtures/invalid/fillplan-real-chart-bad-dataset-ref.json',
  'fixtures/invalid/fillplan-real-chart-kind-mismatch.json',
  'fixtures/invalid/fillplan-bubble-shape-on-categorical-dataset.json',
  'fixtures/invalid/fillplan-real-title-too-short.json',
  'fixtures/invalid/fillplan-section-title-cap-violation.json',
  'fixtures/invalid/fillplan-subtitle-cap-violation.json',
  'fixtures/invalid/fillplan-both-dataset-ref-and-inline.json',
  'fixtures/invalid/fillplan-chart-in-content-slot.json',
  'fixtures/invalid/fillplan-null-category.json',
  'fixtures/invalid/fillplan-bubble-dup-columns.json',
  'fixtures/invalid/fillplan-chart-title-cap.json',
  'fixtures/invalid/fillplan-source-cap.json',
  'fixtures/invalid/fillplan-cover-body-cap.json',
  'fixtures/invalid/fillplan-bullets-cap.json',
  'fixtures/invalid/fillplan-text-cap.json',
  'fixtures/invalid/fillplan-callout-cap.json',
  'fixtures/invalid/fillplan-image-caption-cap.json',
  'fixtures/invalid/fillplan-chart-caption-cap.json',
] as const;

const issuePath = (path: (string | number | symbol)[]): string => path.join('.');

describe('real layout schemas (Phase 3.6)', () => {
  it('registers exactly 26 real layouts matching REAL_LAYOUT_IDS', () => {
    expect(realLayoutSchemas).toHaveLength(26);
    expect(REAL_LAYOUT_IDS).toHaveLength(26);
    expect(new Set(REAL_LAYOUT_IDS).size).toBe(26);
    expect(REAL_LAYOUT_IDS).toContain('chart-stacked-column');
  });

  it('has one valid fixture per layoutId', () => {
    const covered = new Set(
      validLayoutFixtures.map((f) => f.replace('fixtures/layouts/valid-', '').replace('.json', '')),
    );
    for (const id of REAL_LAYOUT_IDS) {
      expect(covered.has(id), `missing valid fixture for ${id}`).toBe(true);
    }
  });

  it.each(validLayoutFixtures)('accepts valid fixture %s', (path) => {
    expect(fillPlanSchema.safeParse(read(path)).success).toBe(true);
  });

  it('accepts line chart with numeric x-axis categories', () => {
    expect(fillPlanSchema.safeParse(read('fixtures/layouts/valid-chart-line-numeric-x.json')).success)
      .toBe(true);
  });

  it.each(newInvalidFixtures)('rejects invalid fixture %s', (path) => {
    expect(fillPlanSchema.safeParse(read(path)).success).toBe(false);
  });

  it('rejects both datasetRef and inline dataset on a chart block', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-both-dataset-ref-and-inline.json'),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes('exactly one of datasetRef or inline dataset'),
        ),
      ).toBe(true);
    }
  });

  it('rejects chart blocks in generic content slots (D21)', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-chart-in-content-slot.json'),
    );
    expect(result.success).toBe(false);
  });

  it('rejects null category labels in categorical datasets', () => {
    const result = fillPlanSchema.safeParse(read('fixtures/invalid/fillplan-null-category.json'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes('non-null')),
      ).toBe(true);
    }
  });

  it('rejects unknown keys on real layout slides', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-real-layout-unknown-key.json'),
    );
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
});

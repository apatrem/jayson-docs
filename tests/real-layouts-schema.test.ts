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
  'fixtures/invalid/fillplan-real-title-over-max.json',
  'fixtures/invalid/fillplan-section-title-cap-violation.json',
  'fixtures/invalid/fillplan-subtitle-cap-violation.json',
] as const;

const issuePath = (path: (string | number | symbol)[]): string => path.join('.');

describe('real layout schemas (Phase 3)', () => {
  it('registers exactly 26 real layouts', () => {
    expect(realLayoutSchemas).toHaveLength(26);
    expect(REAL_LAYOUT_IDS).toHaveLength(26);
    expect(new Set(REAL_LAYOUT_IDS).size).toBe(26);
  });

  it.each(validLayoutFixtures)('accepts valid fixture %s', (path) => {
    expect(fillPlanSchema.safeParse(read(path)).success).toBe(true);
  });

  it.each(newInvalidFixtures)('rejects invalid fixture %s', (path) => {
    expect(fillPlanSchema.safeParse(read(path)).success).toBe(false);
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

  it('rejects chart datasetRef that does not resolve for real chart layouts', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-real-chart-bad-dataset-ref.json'),
    );
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

  it('rejects chart kind mismatch on pinned real chart layouts', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-real-chart-kind-mismatch.json'),
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

  it('rejects categorical dataset shape referenced by bubble chart slot', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-bubble-shape-on-categorical-dataset.json'),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes('bubble chart datasets require')),
      ).toBe(true);
    }
  });

  it('rejects title density cap violations on real layouts', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-real-title-over-max.json'),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('title must be'))).toBe(
        true,
      );
    }
  });

  it('rejects section-title cap violations', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-section-title-cap-violation.json'),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) => issue.message.includes('section-title must be')),
      ).toBe(true);
    }
  });

  it('rejects subtitle cap violations', () => {
    const result = fillPlanSchema.safeParse(
      read('fixtures/invalid/fillplan-subtitle-cap-violation.json'),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('subtitle must be'))).toBe(
        true,
      );
    }
  });
});

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
});

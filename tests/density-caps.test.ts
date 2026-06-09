import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema } from '../src/schema/index.js';
import { collectDensityWarnings } from '../src/schema/density-warnings.js';
import { REGION_CAPS } from '../src/schema/caps.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf-8'));

describe('two-tier density caps (Phase 3.5)', () => {
  it('accepts over-optimal but under-max source (Zod enforces max only)', () => {
    const result = fillPlanSchema.safeParse(read('fixtures/valid/fillplan-over-optimal-source.json'));
    expect(result.success).toBe(true);
  });

  it('emits a soft warning for over-optimal source without rejecting', () => {
    const parsed = fillPlanSchema.parse(read('fixtures/valid/fillplan-over-optimal-source.json'));
    const warnings = collectDensityWarnings(parsed);
    expect(warnings).toContain(
      `warning: source is 58 words (optimal ≤${REGION_CAPS.source.optimal.max}, max ${REGION_CAPS.source.max})`,
    );
  });

  it('rejects source over absolute max', () => {
    const result = fillPlanSchema.safeParse(read('fixtures/invalid/fillplan-source-over-max.json'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('source must be'))).toBe(
        true,
      );
    }
  });

  it('rejects title over absolute max on real layouts', () => {
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

  it('rejects title over absolute max on kpi-row-chart', () => {
    const result = fillPlanSchema.safeParse(read('fixtures/invalid/fillplan-title-over-max.json'));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message.includes('title must be'))).toBe(
        true,
      );
    }
  });

  it('CLI exits 0 and prints soft warning for over-optimal title (pipeline-supported layout)', () => {
    const fixturePath = join(root, 'fixtures/valid/fillplan-over-optimal-title.json');
    const masterPath = join(root, 'templates/PLACEHOLDER-report.master.pptx');
    const outputDir = mkdtempSync(join(tmpdir(), 'jayson-docs-density-'));
    const outputPath = join(outputDir, 'filled.pptx');

    const result = spawnSync(
      process.execPath,
      [
        join(root, 'node_modules/tsx/dist/cli.mjs'),
        join(root, 'src/cli/generate.ts'),
        'fill',
        '--template',
        masterPath,
        '--plan',
        fixturePath,
        '--out',
        outputPath,
      ],
      { cwd: root, encoding: 'utf-8' },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('warning: title is 16 words (optimal 8–15, max 20)');
  });

  it('CLI exits non-zero for source over absolute max', () => {
    const fixturePath = join(root, 'fixtures/invalid/fillplan-source-over-max.json');
    const masterPath = join(root, 'templates/PLACEHOLDER-report.master.pptx');
    const outputDir = mkdtempSync(join(tmpdir(), 'jayson-docs-density-'));
    const outputPath = join(outputDir, 'filled.pptx');

    const result = spawnSync(
      process.execPath,
      [
        join(root, 'node_modules/tsx/dist/cli.mjs'),
        join(root, 'src/cli/generate.ts'),
        'fill',
        '--template',
        masterPath,
        '--plan',
        fixturePath,
        '--out',
        outputPath,
      ],
      { cwd: root, encoding: 'utf-8' },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('fill-plan validation failed');
  });

  it('emits a soft warning for an over-optimal subtitle on a real subtitle slot', () => {
    // Regression guard: the warning walker must fire for the real subtitle slot
    // keys used by the 26 layouts (subtitle / subtitle-left / -middle / -right).
    const plan = read('fixtures/layouts/valid-two-columns-and-subtitles.json') as {
      sections: { slides: Record<string, unknown>[] }[];
    };
    const slide = plan.sections[0]?.slides[0];
    expect(slide).toBeDefined();
    if (!slide) return;
    // 30 words: over the 25-word optimal, under the 40-word max -> warn, not reject.
    slide['subtitle-left'] = {
      kind: 'text',
      body: 'w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11 w12 w13 w14 w15 w16 w17 w18 w19 w20 w21 w22 w23 w24 w25 w26 w27 w28 w29 w30',
    };
    const result = fillPlanSchema.safeParse(plan);
    expect(result.success).toBe(true);
    if (result.success) {
      const warnings = collectDensityWarnings(result.data);
      expect(warnings).toContain(
        `warning: subtitle-left is 30 words (optimal ≤${REGION_CAPS.subtitle.optimal.max}, max ${REGION_CAPS.subtitle.max})`,
      );
    }
  });
});

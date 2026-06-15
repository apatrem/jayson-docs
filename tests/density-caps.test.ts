import { describe, it, expect, vi, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema } from '../src/schema/index.js';
import { collectDensityWarnings } from '../src/schema/density-warnings.js';
import { REGION_CAPS, formatFillBandWarning } from '../src/schema/caps.js';
import * as fillBandCatalogue from '../src/schema/fill-band-catalogue.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf-8'));

function words(n: number): string {
  return Array.from({ length: n }, (_, i) => `w${i + 1}`).join(' ');
}

function runCli(fixturePath: string, template = join(root, 'templates/report.master.pptx')): ReturnType<typeof spawnSync> {
  const outputDir = mkdtempSync(join(tmpdir(), 'jayson-docs-density-'));
  const outputPath = join(outputDir, 'filled.pptx');

  return spawnSync(
    process.execPath,
    [
      join(root, 'node_modules/tsx/dist/cli.mjs'),
      join(root, 'src/cli/generate.ts'),
      'fill',
      '--template',
      template,
      '--plan',
      fixturePath,
      '--out',
      outputPath,
    ],
    { cwd: root, encoding: 'utf-8' },
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  fillBandCatalogue.resetFillBandCatalogueCache();
});

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
    const result = runCli(fixturePath, join(root, 'templates/PLACEHOLDER-report.master.pptx'));

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('warning: title is 16 words (optimal 8–15, max 20)');
  });

  it('CLI exits non-zero for source over absolute max', () => {
    const fixturePath = join(root, 'fixtures/invalid/fillplan-source-over-max.json');
    const result = runCli(fixturePath);

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

describe('D26 two-sided fill-band soft-warnings (T-202)', () => {
  it('emits an under-fill warning when body content is below band.lower', () => {
    const plan = structuredClone(read('fixtures/layouts/valid-title.json')) as {
      sections: { slides: Record<string, unknown>[] }[];
    };
    const slide = plan.sections[0]?.slides[0];
    expect(slide).toBeDefined();
    if (!slide) return;
    slide['body-left'] = { kind: 'text', body: words(10) };

    const parsed = fillPlanSchema.parse(plan);
    const warnings = collectDensityWarnings(parsed);
    expect(warnings).toEqual([
      formatFillBandWarning('title', 'body-left', 'under-fill', 10, {
        unit: 'words',
        lower: 60,
        upper: 100,
      }),
    ]);
  });

  it('emits an over-fill warning when body content is above band.upper', () => {
    vi.spyOn(fillBandCatalogue, 'lookupFillBand').mockReturnValue({
      unit: 'words',
      lower: 60,
      upper: 80,
    });

    const plan = structuredClone(read('fixtures/layouts/valid-title.json')) as {
      sections: { slides: Record<string, unknown>[] }[];
    };
    const slide = plan.sections[0]?.slides[0];
    expect(slide).toBeDefined();
    if (!slide) return;
    slide['body-left'] = { kind: 'text', body: words(85) };

    const parsed = fillPlanSchema.parse(plan);
    const warnings = collectDensityWarnings(parsed);
    expect(warnings).toEqual([
      formatFillBandWarning('title', 'body-left', 'over-fill', 85, {
        unit: 'words',
        lower: 60,
        upper: 80,
      }),
    ]);
  });

  it('does not emit D26 warnings for heading/label regions without bands', () => {
    const parsed = fillPlanSchema.parse(read('fixtures/layouts/valid-title-only.json'));
    const warnings = collectDensityWarnings(parsed);
    expect(warnings).toEqual([]);
    expect(warnings.some((w) => w.includes('fill-band'))).toBe(false);
  });

  it('suppresses D23 optimal warnings when a D26 per-box band exists (dedup)', () => {
    const plan = structuredClone(read('fixtures/layouts/valid-title.json')) as {
      sections: { slides: Record<string, unknown>[] }[];
    };
    const slide = plan.sections[0]?.slides[0];
    expect(slide).toBeDefined();
    if (!slide) return;
    slide['body-left'] = { kind: 'text', body: words(70) };

    const parsed = fillPlanSchema.parse(plan);
    const warnings = collectDensityWarnings(parsed);
    expect(warnings).toEqual([]);
  });

  it('CLI exits 0 and prints stderr under-fill warning without touching stdout', () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'jayson-docs-fill-band-'));
    const fixturePath = join(outputDir, 'under-fill.json');
    const plan = structuredClone(read('fixtures/layouts/valid-title.json')) as {
      sections: { slides: Record<string, unknown>[] }[];
    };
    plan.sections[0]!.slides[0]!['body-left'] = { kind: 'text', body: words(10) };
    writeFileSync(fixturePath, JSON.stringify(plan));

    const result = runCli(fixturePath);
    expect(result.status).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(
      'warning: slide "title" body-left under-fill: 10 words (fill-band 60–100)',
    );
  });

  it('still rejects over-max content with exit 2 (D23 max unchanged)', () => {
    const result = runCli(join(root, 'fixtures/invalid/fillplan-text-cap.json'));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('fill-plan validation failed');
  });
});

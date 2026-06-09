import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fillPlanSchema } from '../src/schema/index.js';
import { REGION_CAPS } from '../src/schema/caps.js';
import type { LayoutSpec } from '../src/setup/types.js';
import { loadMaster } from '../src/pipeline/load-master.js';
import { fillSlide } from '../src/pipeline/fill-slide.js';
import { saveOutput } from '../src/pipeline/save-output.js';
import { readPptxChartDataForShape, type PptxChartData } from './helpers/pptx-chart.js';
import { readPptxImageBytesForShape } from './helpers/pptx-image.js';
import {
  countPresentationSlides,
  readPptxShapeTextsBySlide,
  readPptxShapeXml,
} from './helpers/pptx-shapes.js';

/*
 * Phase 5 FROZEN ACCEPTANCE — wire the 26-layout master into the fill pipeline.
 *
 * These blocks are skipped while main intentionally lacks the implementation.
 * Each task removes only its own `.skip`; the assertions are complete now so
 * "un-skip and pass" proves the documented behavior instead of a placeholder.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const realMaster = join(root, 'templates/report.master.pptx');
const readJson = (path: string): unknown => JSON.parse(readFileSync(join(root, path), 'utf-8'));

interface RawDeck {
  datasets?: Record<string, { columns: string[]; rows: (string | number | null)[][] }>;
  sections: { slides: Record<string, unknown>[] }[];
}

function rawDeck(path: string): RawDeck {
  return readJson(path) as RawDeck;
}

async function fillPlanToFile(plan: unknown): Promise<string> {
  const parsed = fillPlanSchema.parse(plan);
  if (parsed.kind !== 'deck') {
    throw new Error('expected a deck fill-plan');
  }

  const out = join(mkdtempSync(join(tmpdir(), 'jayson-docs-p5-')), 'filled.pptx');
  const automizer = loadMaster(realMaster);
  for (const section of parsed.sections) {
    for (const slide of section.slides) {
      fillSlide(automizer, slide, parsed.datasets);
    }
  }
  await saveOutput(automizer, out);
  return out;
}

async function fillFixtureToFile(path: string): Promise<string> {
  return fillPlanToFile(readJson(path));
}

function fixtureSlide(path: string): Record<string, unknown> {
  const slide = rawDeck(path).sections[0]?.slides[0];
  if (slide === undefined) {
    throw new Error(`fixture has no slide: ${path}`);
  }
  return slide;
}

function expectCategoryChart(
  chart: PptxChartData,
  series: string[],
  categories: string[],
  values: number[][],
): void {
  expect(chart.series).toEqual(series);
  expect(chart.categories).toEqual(categories);
  expect(chart.values).toEqual(values);
}

describe('T-101 — generic fill engine + first real layout (section)', () => {
  it('fills a section layout against the real master', async () => {
    const out = await fillFixtureToFile('fixtures/layouts/valid-section.json');
    expect(await countPresentationSlides(out)).toBe(1);
    const slides = await readPptxShapeTextsBySlide(out);
    expect(slides[0]?.get('slot.section-title')).toBe(
      fixtureSlide('fixtures/layouts/valid-section.json')['section-title'],
    );
  });
});

describe.skip('T-102 — generic text slots (title / subtitle / source)', () => {
  it('fills string and text-block slots with exact fixture values', async () => {
    const cover = await fillFixtureToFile('fixtures/layouts/valid-cover.json');
    const coverTexts = (await readPptxShapeTextsBySlide(cover))[0];
    expect(coverTexts?.get('slot.title')).toBe(
      fixtureSlide('fixtures/layouts/valid-cover.json').title,
    );
    expect(coverTexts?.get('slot.subtitle')).toBe('Short subtitle for column');

    const titleSubtitle = await fillFixtureToFile('fixtures/layouts/valid-title-and-subtitle.json');
    const titleSubtitleTexts = (await readPptxShapeTextsBySlide(titleSubtitle))[0];
    expect(titleSubtitleTexts?.get('slot.source')).toBe(
      fixtureSlide('fixtures/layouts/valid-title-and-subtitle.json').source,
    );
  });

  it('renders subtitle callouts through the same named text slot', async () => {
    const plan = structuredClone(rawDeck('fixtures/layouts/valid-title-and-subtitle.json'));
    const slide = plan.sections[0]?.slides[0];
    if (slide === undefined) {
      throw new Error('missing title-and-subtitle fixture slide');
    }
    slide.subtitle = { kind: 'callout', body: 'Decision required this week' };

    const out = await fillPlanToFile(plan);
    const texts = (await readPptxShapeTextsBySlide(out))[0];
    expect(texts?.get('slot.subtitle')).toBe('Decision required this week');
  });
});

describe.skip('T-103 — content-block slots (bullets / text / callout / image)', () => {
  it('renders bullets as bullets and text/callout bodies as text', async () => {
    const twoColumns = await fillFixtureToFile('fixtures/layouts/valid-two-columns.json');
    const twoColumnTexts = (await readPptxShapeTextsBySlide(twoColumns))[0];
    expect(twoColumnTexts?.get('slot.body-left')).toContain('Point one');
    expect(twoColumnTexts?.get('slot.body-left')).toContain('Point two');
    expect(twoColumnTexts?.get('slot.body-right')).toContain('Point one');

    const leftXml = await readPptxShapeXml(twoColumns, 'slot.body-left');
    expect([...leftXml.matchAll(/<a:bu(?:Char|AutoNum)\b/g)]).toHaveLength(2);

    const sidebar = await fillFixtureToFile('fixtures/layouts/valid-narrative-with-sidebar.json');
    const sidebarTexts = (await readPptxShapeTextsBySlide(sidebar))[0];
    expect(sidebarTexts?.get('slot.body-right')).toBe('Short narrative body text for the slot.');
  });

  it('replaces the named cover image with the referenced fixture asset', async () => {
    const out = await fillFixtureToFile('fixtures/layouts/valid-cover.json');
    const actual = await readPptxImageBytesForShape(out, 'slot.image');
    const expected = readFileSync(join(root, 'fixtures/assets/test-logo.svg'));
    expect(Buffer.from(actual)).toEqual(expected);
  });

  it('fails loudly when a caption has no named master shape', () => {
    const plan = structuredClone(rawDeck('fixtures/layouts/valid-cover.json'));
    const slide = plan.sections[0]?.slides[0];
    if (slide === undefined) {
      throw new Error('missing cover fixture slide');
    }
    slide.image = {
      ref: 'fixtures/assets/test-logo.svg',
      caption: 'Caption without a slot in the frozen master',
    };

    const parsed = fillPlanSchema.parse(plan);
    if (parsed.kind !== 'deck') {
      throw new Error('expected a deck fill-plan');
    }
    const parsedSlide = parsed.sections[0]?.slides[0];
    if (parsedSlide === undefined) {
      throw new Error('expected a parsed cover slide');
    }
    const automizer = loadMaster(realMaster);
    expect(() => fillSlide(automizer, parsedSlide, parsed.datasets)).toThrow(
      /slot\.image\.caption/,
    );
  });
});

describe.skip('T-104 — chart-slot data-swap (all four real chart kinds)', () => {
  it('round-trips stacked and clustered column datasets', async () => {
    for (const fixture of [
      'fixtures/layouts/valid-chart-stacked-column.json',
      'fixtures/layouts/valid-chart-clustered-column.json',
    ]) {
      const out = await fillFixtureToFile(fixture);
      expectCategoryChart(
        await readPptxChartDataForShape(out, 'slot.chart'),
        ['series_a'],
        ['A', 'B'],
        [[10], [20]],
      );
    }
  });

  it('round-trips line data and fills its chart title', async () => {
    const out = await fillFixtureToFile('fixtures/layouts/valid-chart-line.json');
    expectCategoryChart(
      await readPptxChartDataForShape(out, 'slot.chart'),
      ['value'],
      ['2024', '2025'],
      [[10], [20]],
    );
    const texts = (await readPptxShapeTextsBySlide(out))[0];
    expect(texts?.get('slot.chart-title')).toBe('Trend over time');
  });

  it('round-trips bubble x/y/size values through the named chart shape', async () => {
    const out = await fillFixtureToFile('fixtures/layouts/valid-chart-bubble.json');
    const chart = await readPptxChartDataForShape(out, 'slot.chart');
    expect(chart.bubbles?.map(({ x, y, size }) => [x, y, size])).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ]);
  });

  it('keeps schema rejection for a chart kind that mismatches its slot', () => {
    expect(
      fillPlanSchema.safeParse(readJson('fixtures/invalid/fillplan-real-chart-kind-mismatch.json'))
        .success,
    ).toBe(false);
  });
});

describe.skip('T-105 — layout catalogue, report-pptx skill, and CLI e2e', () => {
  it('publishes a 26-layout catalogue that mirrors layout-spec and density caps', () => {
    const spec = readJson('src/setup/layout-spec.json') as LayoutSpec;
    const catalogue = readJson('skills/report-pptx/layout-catalogue.json') as {
      caps: unknown;
      layouts: {
        layoutId: string;
        tier: string;
        usage: string;
        regions: Record<string, string>;
      }[];
    };

    expect(catalogue.caps).toEqual(REGION_CAPS);
    expect(catalogue.layouts.map(({ layoutId }) => layoutId).sort()).toEqual(
      spec.layouts.map(({ layoutId }) => layoutId).sort(),
    );

    for (const layout of spec.layouts) {
      const entry = catalogue.layouts.find(({ layoutId }) => layoutId === layout.layoutId);
      expect(entry?.tier).toBe(layout.tier);
      expect(entry?.usage.trim().length).toBeGreaterThan(0);
      for (const slot of layout.slots.filter(({ regionKind }) => regionKind !== 'footer')) {
        expect(entry?.regions[slot.slotName]?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('updates the skill and manifest to use the real catalogue and master', () => {
    const skill = readFileSync(join(root, 'skills/report-pptx/SKILL.md'), 'utf-8');
    const manifest = readFileSync(join(root, 'skills/manifest.json'), 'utf-8');

    expect(skill).toContain('layout-catalogue.json');
    expect(skill).toContain('templates/report.master.pptx');
    expect(skill).not.toMatch(/kpi-row-chart only|Phase 5/);
    expect(manifest).not.toMatch(/kpi-row-chart only/);
  });

  it('fills a representative multi-layout deck through the CLI', async () => {
    const fixturePath = join(root, 'fixtures/valid-real-multi-layout-plan.json');
    const outputPath = join(mkdtempSync(join(tmpdir(), 'jayson-docs-p5-cli-')), 'filled.pptx');

    execFileSync(
      process.execPath,
      [
        join(root, 'node_modules/tsx/dist/cli.mjs'),
        join(root, 'src/cli/generate.ts'),
        'fill',
        '--template',
        realMaster,
        '--plan',
        fixturePath,
        '--out',
        outputPath,
      ],
      { cwd: root, stdio: 'pipe' },
    );

    expect(existsSync(outputPath)).toBe(true);
    expect(await countPresentationSlides(outputPath)).toBe(4);
    const slides = await readPptxShapeTextsBySlide(outputPath);
    expect(slides[0]?.get('slot.title')).toBe(
      'Executive review of the transformation programme and next steps',
    );
    expect(slides[1]?.get('slot.section-title')).toBe('Performance update');
    expect(slides[2]?.get('slot.body-left')).toContain('Point one');
    expect(slides[3]?.get('slot.chart-title')).toBe('Units by category');
    expectCategoryChart(
      await readPptxChartDataForShape(outputPath, 'slot.chart', 3),
      ['series_a'],
      ['A', 'B'],
      [[10], [20]],
    );
  });
});

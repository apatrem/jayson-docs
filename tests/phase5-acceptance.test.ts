import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { fillPlanSchema } from '../src/schema/index.js';
import { REGION_CAPS } from '../src/schema/caps.js';
import type { Slide } from '../src/schema/slide.js';
import type { LayoutSlot, LayoutSpec } from '../src/setup/types.js';
import { ImageRefError, MasterError, ShapeNameError } from '../src/pipeline/errors.js';
import { loadMaster } from '../src/pipeline/load-master.js';
import { fillImageSlot } from '../src/pipeline/fill-content-slot.js';
import { fillSlide } from '../src/pipeline/fill-slide.js';
import { saveOutput } from '../src/pipeline/save-output.js';
import { readPptxChartDataForShape, type PptxChartData } from './helpers/pptx-chart.js';
import { readPptxImageBytesForShape } from './helpers/pptx-image.js';
import { activeSlidePaths, readPartText } from './helpers/pptx-package.js';
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

function textRunsFromShapeXml(shapeXml: string): string[] {
  return [...shapeXml.matchAll(/<a:t(?:[^>]*)>([^<]*)<\/a:t>/g)].map((match) => match[1] ?? '');
}

function countBulletParagraphs(shapeXml: string): number {
  return [...shapeXml.matchAll(/<a:bu(?:Char|AutoNum)\b/g)].length;
}

async function expectBulletsInShape(
  filePath: string,
  shapeName: string,
  items: string[],
): Promise<void> {
  const xml = await readPptxShapeXml(filePath, shapeName);
  expect(textRunsFromShapeXml(xml)).toEqual(items);
  expect(countBulletParagraphs(xml)).toBe(items.length);
}

function bulletsItems(slide: Record<string, unknown>, key: string): string[] {
  const block = slide[key] as { items?: string[] } | undefined;
  if (block?.items === undefined) {
    throw new Error(`fixture slide missing bullets at ${key}`);
  }
  return block.items;
}

function textBody(slide: Record<string, unknown>, key: string): string {
  const block = slide[key] as { body?: string } | undefined;
  if (block?.body === undefined) {
    throw new Error(`fixture slide missing text body at ${key}`);
  }
  return block.body;
}

describe('T-101 — generic fill engine + first real layout (section)', () => {
  it('fills a section layout against the real master', async () => {
    const out = await fillFixtureToFile('fixtures/layouts/valid-section.json');
    expect(await countPresentationSlides(out)).toBe(1);
    const slides = await readPptxShapeTextsBySlide(out);
    expect(slides[0]?.get('slot.section-title')).toBe(
      fixtureSlide('fixtures/layouts/valid-section.json')['section-title'],
    );
    expect(slides[0]?.get('slot.subtitle')).toBe('Short subtitle for column');
  });

  it('throws the explicit not-yet-supported error for slot kinds later tasks land', () => {
    // T-103 made `body-right` fillable; chart-line now fails first on `chart-title` (T-104).
    const parsed = fillPlanSchema.parse(readJson('fixtures/layouts/valid-chart-line.json'));
    const chartLine = parsed.kind === 'deck' ? parsed.sections[0]?.slides[0] : undefined;
    if (chartLine === undefined) {
      throw new Error('expected a chart-line slide');
    }
    expect(() => fillSlide(loadMaster(realMaster), chartLine, parsed.datasets)).toThrow(
      /slot\.chart-title.*T-104/,
    );
  });

  it('classifies an unknown layoutId as a MasterError', () => {
    const slide = { layoutId: 'no-such-layout' } as unknown as Slide;
    expect(() => fillSlide(loadMaster(realMaster), slide)).toThrow(MasterError);
  });
});

describe('T-102 — generic text slots (title / subtitle / source)', () => {
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

// NOT frozen — PR #26 remediation: proves the image fill is real, refs hardened.
describe('T-102 remediation — real image fill, ref hardening, multi-line text', () => {
  const imageSlot: LayoutSlot = {
    slotName: 'slot.image',
    regionKind: 'image',
    match: { currentShapeName: 'slot.image' },
  };
  const fillImage = (image: unknown) => () =>
    // Caption/ref validation throws before any automizer/slide use.
    fillImageSlot(undefined as never, undefined as never, 'cover', imageSlot, image);

  it('embeds the cover image via a real slide relation, with no orphaned rels-root Target', async () => {
    const out = await fillFixtureToFile('fixtures/layouts/valid-cover.json');
    const imageBytes = Buffer.from(await readPptxImageBytesForShape(out, 'slot.image'));
    expect(imageBytes).toEqual(readFileSync(join(root, 'fixtures/assets/test-logo.svg')));

    const zip = await JSZip.loadAsync(await readFile(out));
    const slidePath = (await activeSlidePaths(zip))[0] ?? '';
    const relsPath = `${dirname(slidePath)}/_rels/${basename(slidePath)}.rels`;
    expect(await readPartText(zip, relsPath)).not.toMatch(/<Relationships[^>]*Target=/);
  });

  it('rejects captions (ShapeNameError) and unsafe or missing refs (ImageRefError)', () => {
    const withCaption = { ref: 'fixtures/assets/test-logo.svg', caption: 'No caption shape' };
    expect(fillImage(withCaption)).toThrow(ShapeNameError);
    expect(fillImage(withCaption)).toThrow(/slot\.image\.caption/);

    expect(fillImage({ ref: join(root, 'fixtures/assets/test-logo.svg') })).toThrow(ImageRefError);
    expect(fillImage({ ref: 'fixtures/assets/does-not-exist.png' })).toThrow(ImageRefError);

    const outside = mkdtempSync(join(tmpdir(), 'jayson-docs-outside-'));
    const base = mkdtempSync(join(tmpdir(), 'jayson-docs-base-'));
    writeFileSync(join(outside, 'secret.png'), 'outside-cwd');
    symlinkSync(join(outside, 'secret.png'), join(base, 'link.png'));
    const cwd = process.cwd();
    process.chdir(base);
    try {
      const escapes = /escapes the working directory/;
      expect(fillImage({ ref: join('..', basename(outside), 'secret.png') })).toThrow(escapes);
      expect(fillImage({ ref: 'link.png' })).toThrow(escapes);
    } finally {
      process.chdir(cwd);
    }
  });

  it('splits a multi-line source into one paragraph per line', async () => {
    const plan = structuredClone(rawDeck('fixtures/layouts/valid-title-and-subtitle.json'));
    Object.assign(plan.sections[0]?.slides[0] ?? {}, {
      source: 'Source: ACME analysis, June 2026.\nNote: provisional figures.',
    });

    const xml = await readPptxShapeXml(await fillPlanToFile(plan), 'slot.source');
    expect([...xml.matchAll(/<a:p[ >]/g)]).toHaveLength(2);
    expect(xml).not.toMatch(/<a:t[^>]*>[^<]*\n/);
  });
});

describe('T-103 — content-block slots (bullets / text / callout / image)', () => {
  it('renders bullets as bullets and text/callout bodies as text', async () => {
    const twoColumnsFixture = fixtureSlide('fixtures/layouts/valid-two-columns.json');
    const twoColumns = await fillFixtureToFile('fixtures/layouts/valid-two-columns.json');
    await expectBulletsInShape(twoColumns, 'slot.body-left', bulletsItems(twoColumnsFixture, 'body-left'));
    await expectBulletsInShape(
      twoColumns,
      'slot.body-right',
      bulletsItems(twoColumnsFixture, 'body-right'),
    );

    const sidebarFixture = fixtureSlide('fixtures/layouts/valid-narrative-with-sidebar.json');
    const sidebarPlan = structuredClone(rawDeck('fixtures/layouts/valid-narrative-with-sidebar.json'));
    const sidebarSlide = sidebarPlan.sections[0]?.slides[0];
    if (sidebarSlide === undefined) {
      throw new Error('missing narrative-with-sidebar fixture slide');
    }
    sidebarSlide['body-right'] = {
      kind: 'callout',
      body: textBody(sidebarFixture, 'body-right'),
    };

    const sidebar = await fillPlanToFile(sidebarPlan);
    await expectBulletsInShape(
      sidebar,
      'slot.body-left',
      bulletsItems(sidebarFixture, 'body-left'),
    );
    const sidebarTexts = (await readPptxShapeTextsBySlide(sidebar))[0];
    expect(sidebarTexts?.get('slot.body-right')).toBe(textBody(sidebarFixture, 'body-right'));
  });

  it('embeds distinct body images that share a basename without colliding media parts', async () => {
    const imageRoot = mkdtempSync(join(tmpdir(), 'jayson-docs-img-'));
    const dirA = join(imageRoot, 'a');
    const dirB = join(imageRoot, 'b');
    mkdirSync(dirA, { recursive: true });
    mkdirSync(dirB, { recursive: true });
    const bytesA = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="red"/></svg>');
    const bytesB = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="blue"/></svg>');
    writeFileSync(join(dirA, 'logo.svg'), bytesA);
    writeFileSync(join(dirB, 'logo.svg'), bytesB);

    const cwd = process.cwd();
    process.chdir(imageRoot);
    try {
      const out = await fillPlanToFile({
        kind: 'deck',
        meta: {
          templateId: 'report.master.pptx',
          client: 'ACME',
          date: '2026-06-08',
          language: 'en',
        },
        sections: [
          {
            title: 'Fixture',
            slides: [
              {
                layoutId: 'two-columns',
                title: 'Eight word minimum title for every layout fixture test',
                'body-left': { kind: 'image', ref: 'a/logo.svg' },
                'body-right': { kind: 'image', ref: 'b/logo.svg' },
                source: 'Source: ACME analysis, June 2026.',
              },
            ],
          },
        ],
      });
      expect(Buffer.from(await readPptxImageBytesForShape(out, 'slot.body-left'))).toEqual(bytesA);
      expect(Buffer.from(await readPptxImageBytesForShape(out, 'slot.body-right'))).toEqual(bytesB);
    } finally {
      process.chdir(cwd);
    }
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

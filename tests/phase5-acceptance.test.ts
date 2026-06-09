import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema } from '../src/schema/index.js';
import { loadMaster } from '../src/pipeline/load-master.js';
import { fillSlide } from '../src/pipeline/fill-slide.js';
import { saveOutput } from '../src/pipeline/save-output.js';
import { readPptxShapeTexts, countPresentationSlides } from './helpers/pptx-shapes.js';
import { readPptxChartData } from './helpers/pptx-chart.js';

/*
 * Phase 5 FROZEN ACCEPTANCE — wire the 26-layout master into the fill pipeline.
 *
 * These are committed as `describe.skip` on purpose: `main` is a protected,
 * required-green branch, so we cannot land literally-red tests. The skipped
 * blocks ARE the frozen acceptance — each task (T-101..T-105) un-skips its own
 * block and implements until it passes. The precise, authoritative criteria live
 * in tasks/T-10x-*.md; the bodies here are the representative target.
 *
 * All blocks fill against the REAL 26-layout master (templates/report.master.pptx),
 * unlike tests/pipeline.test.ts which uses the v1 PLACEHOLDER master.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REAL_MASTER = join(root, 'templates/report.master.pptx');
const readJson = (p: string): unknown => JSON.parse(readFileSync(join(root, p), 'utf-8'));

/** Fill the first slide of a layout fixture against the real master; return the output path. */
async function fillToFile(fixtureRelPath: string): Promise<string> {
  const parsed = fillPlanSchema.parse(readJson(fixtureRelPath));
  if (parsed.kind !== 'deck') throw new Error('expected a deck fill-plan');
  const slide = parsed.sections[0]?.slides[0];
  if (slide === undefined) throw new Error('expected at least one slide');
  const out = join(mkdtempSync(join(tmpdir(), 'jayson-docs-p5-')), 'filled.pptx');
  const automizer = loadMaster(REAL_MASTER);
  fillSlide(automizer, slide, parsed.datasets);
  await saveOutput(automizer, out);
  return out;
}

/** Raw first-slide JSON, to assert an output slot equals the fixture's input value. */
function fixtureSlide(fixtureRelPath: string): Record<string, unknown> {
  const raw = readJson(fixtureRelPath) as { sections: { slides: Record<string, unknown>[] }[] };
  const s = raw.sections[0]?.slides[0];
  if (s === undefined) throw new Error('no slide in fixture');
  return s;
}

describe.skip('T-101 — generic fill engine + first real layout (section)', () => {
  it('fills a section layout against the real master', async () => {
    const out = await fillToFile('fixtures/layouts/valid-section.json');
    expect(await countPresentationSlides(out)).toBe(1);
    const texts = await readPptxShapeTexts(out);
    expect(texts.get('slot.section-title')).toBe(
      fixtureSlide('fixtures/layouts/valid-section.json')['section-title'],
    );
  });
});

describe.skip('T-102 — generic text slots (title / subtitle / source)', () => {
  it('fills the title slot on cover from the fixture value', async () => {
    const out = await fillToFile('fixtures/layouts/valid-cover.json');
    const texts = await readPptxShapeTexts(out);
    expect(texts.get('slot.title')).toBe(fixtureSlide('fixtures/layouts/valid-cover.json').title);
  });
});

describe.skip('T-103 — content-block slots (bullets / text / callout / image)', () => {
  it('fills body content on two-columns', async () => {
    const out = await fillToFile('fixtures/layouts/valid-two-columns.json');
    const texts = await readPptxShapeTexts(out);
    // worker (T-103): assert bullets render as bulleted multi-text and text/callout as text in body-left/right.
    expect(texts.size).toBeGreaterThan(0);
  });
});

describe.skip('T-104 — chart-slot data-swap (stacked-column / line / bubble)', () => {
  it('swaps the fixture dataset into slot.chart on a chart layout', async () => {
    const out = await fillToFile('fixtures/layouts/valid-chart-stacked-column.json');
    const chart = await readPptxChartData(out);
    // worker (T-104): assert series/categories/values round-trip the fixture dataset (and bubble x/y/size).
    expect(chart.categories.length).toBeGreaterThan(0);
  });
});

describe.skip('T-105 — report-pptx skill: any real layout via CLI', () => {
  it('CLI fills a multi-layout deck against the canonical master', () => {
    // worker (T-105): add a multi-layout fixture, run the CLI fill subcommand (mirror the M4 CLI test),
    // assert an N-slide deck with each layout's slots filled against templates/report.master.pptx.
    expect(true).toBe(true);
  });
});

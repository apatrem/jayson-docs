import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema } from '../src/schema/index.js';
import { loadMaster } from '../src/pipeline/load-master.js';
import { fillSlide } from '../src/pipeline/fill-slide.js';
import { saveOutput } from '../src/pipeline/save-output.js';
import { readPptxShapeTexts, countPresentationSlides } from './helpers/pptx-shapes.js';
import { readPptxChartData } from './helpers/pptx-chart.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const masterPath = join(root, 'templates/PLACEHOLDER-report.master.pptx');
const fixturePath = join(root, 'fixtures/valid-fill-plan.json');

describe('PPTX fill pipeline (M2)', () => {
  beforeAll(() => {
    // Ensure the placeholder master exists for CI / fresh clones.
    if (!readFileSync(masterPath)) {
      throw new Error(`missing master template: ${masterPath}`);
    }
  });

  it('fills title, kpi-strip, and narrative shapes from the valid fixture', async () => {
    const parsed = fillPlanSchema.parse(JSON.parse(readFileSync(fixturePath, 'utf-8')));
    if (parsed.kind !== 'deck') {
      throw new Error('expected deck fill-plan fixture');
    }

    const slide = parsed.sections[0]?.slides[0];
    expect(slide?.layoutId).toBe('kpi-row-chart');
    if (slide === undefined) {
      throw new Error('expected at least one slide in fixture');
    }

    const outputDir = mkdtempSync(join(tmpdir(), 'jayson-docs-m2-'));
    const outputPath = join(outputDir, 'filled.pptx');

    const automizer = loadMaster(masterPath);
    fillSlide(automizer, slide, parsed.datasets);
    await saveOutput(automizer, outputPath);

    expect(await countPresentationSlides(outputPath)).toBe(1);

    const shapeTexts = await readPptxShapeTexts(outputPath);

    expect(shapeTexts.get('slot.title')).toBe(slide.title);
    expect(shapeTexts.get('slot.kpi-strip.card1.figure')).toBe('2.4x');
    expect(shapeTexts.get('slot.kpi-strip.card1.label')).toBe('demand vs ammonia');
    expect(shapeTexts.get('slot.kpi-strip.card1.delta')).toBe('+140%');
    expect(shapeTexts.get('slot.kpi-strip.card2.figure')).toBe('EUR 68/MWh');
    expect(shapeTexts.get('slot.kpi-strip.card2.label')).toBe('LCOE target');
    expect(shapeTexts.get('slot.kpi-strip.card2.delta')).toBe('-12%');
    expect(shapeTexts.get('slot.kpi-strip.card3.figure')).toBe('7');
    expect(shapeTexts.get('slot.kpi-strip.card3.label')).toBe('credible offtakers');
    expect(shapeTexts.get('slot.kpi-strip.card3.delta')).toBe('');

    const narrativeText = shapeTexts.get('slot.narrative') ?? '';
    expect(narrativeText).toContain('Three industries clear the bankability gate in all scenarios.');
    expect(narrativeText).toContain('Ammonia trails on counterparty diversity, not on LCOE.');
    expect(narrativeText).toContain('Final selection in Module 2.');
  });

  it('swaps chart data from the fill-plan dataset into slot.chart (M3)', async () => {
    const parsed = fillPlanSchema.parse(JSON.parse(readFileSync(fixturePath, 'utf-8')));
    if (parsed.kind !== 'deck') {
      throw new Error('expected deck fill-plan fixture');
    }

    const slide = parsed.sections[0]?.slides[0];
    if (slide?.layoutId !== 'kpi-row-chart') {
      throw new Error('expected kpi-row-chart slide in fixture');
    }

    const dataset = parsed.datasets?.tier1_demand_2032;
    expect(dataset).toBeDefined();
    if (dataset === undefined) {
      throw new Error('expected tier1_demand_2032 dataset in fixture');
    }

    const outputDir = mkdtempSync(join(tmpdir(), 'jayson-docs-m3-'));
    const outputPath = join(outputDir, 'filled.pptx');

    const automizer = loadMaster(masterPath);
    fillSlide(automizer, slide, parsed.datasets);
    await saveOutput(automizer, outputPath);

    const chartData = await readPptxChartData(outputPath);

    expect(chartData.series).toEqual(['low', 'base', 'high']);
    expect(chartData.categories).toEqual([
      'Industry A',
      'Industry B',
      'Industry C',
      'Ammonia (baseline)',
    ]);

    const expectedValues = dataset.rows.map((row) =>
      row.slice(1).map((value) => (typeof value === 'number' ? value : Number(value))),
    );
    expect(chartData.values).toEqual(expectedValues);
  });

  it('CLI fill subcommand end-to-end: shapes filled + chart round-trip (M4)', async () => {
    const parsed = fillPlanSchema.parse(JSON.parse(readFileSync(fixturePath, 'utf-8')));
    if (parsed.kind !== 'deck') {
      throw new Error('expected deck fill-plan fixture');
    }

    const slide = parsed.sections[0]?.slides[0];
    if (slide?.layoutId !== 'kpi-row-chart') {
      throw new Error('expected kpi-row-chart slide in fixture');
    }

    const dataset = parsed.datasets?.tier1_demand_2032;
    expect(dataset).toBeDefined();

    const outputDir = mkdtempSync(join(tmpdir(), 'jayson-docs-cli-'));
    const outputPath = join(outputDir, 'filled.pptx');

    execFileSync(
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
      { cwd: root, stdio: 'pipe' },
    );

    expect(existsSync(outputPath)).toBe(true);
    expect(await countPresentationSlides(outputPath)).toBe(1);

    const shapeTexts = await readPptxShapeTexts(outputPath);

    expect(shapeTexts.get('slot.title')).toBe(slide.title);
    expect(shapeTexts.get('slot.kpi-strip.card1.figure')).toBe('2.4x');
    expect(shapeTexts.get('slot.kpi-strip.card1.label')).toBe('demand vs ammonia');
    expect(shapeTexts.get('slot.kpi-strip.card1.delta')).toBe('+140%');
    expect(shapeTexts.get('slot.kpi-strip.card2.figure')).toBe('EUR 68/MWh');
    expect(shapeTexts.get('slot.kpi-strip.card2.label')).toBe('LCOE target');
    expect(shapeTexts.get('slot.kpi-strip.card2.delta')).toBe('-12%');
    expect(shapeTexts.get('slot.kpi-strip.card3.figure')).toBe('7');
    expect(shapeTexts.get('slot.kpi-strip.card3.label')).toBe('credible offtakers');

    const narrativeText = shapeTexts.get('slot.narrative') ?? '';
    expect(narrativeText).toContain('Three industries clear the bankability gate in all scenarios.');
    expect(narrativeText).toContain('Ammonia trails on counterparty diversity, not on LCOE.');
    expect(narrativeText).toContain('Final selection in Module 2.');

    const chartData = await readPptxChartData(outputPath);
    expect(chartData.series).toEqual(['low', 'base', 'high']);
    expect(chartData.categories).toEqual([
      'Industry A',
      'Industry B',
      'Industry C',
      'Ammonia (baseline)',
    ]);

    if (dataset === undefined) {
      throw new Error('expected tier1_demand_2032 dataset in fixture');
    }

    const expectedValues = dataset.rows.map((row) =>
      row.slice(1).map((value) => (typeof value === 'number' ? value : Number(value))),
    );
    expect(chartData.values).toEqual(expectedValues);
  });
});

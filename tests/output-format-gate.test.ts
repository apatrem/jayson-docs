import { readdirSync, readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, basename, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { fillPlanSchema } from '../src/schema/index.js';
import { loadMaster } from '../src/pipeline/load-master.js';
import { fillSlide } from '../src/pipeline/fill-slide.js';
import { saveOutput } from '../src/pipeline/save-output.js';
import { activeSlidePaths } from './helpers/pptx-package.js';
import {
  appendExternalRelationship,
  assertOutputFormatGate,
  corruptInternalRelationshipTarget,
  OutputFormatGateError,
  pptxHasExternalRelationship,
} from './helpers/pptx-output-format-gate.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturePaths = [
  ...readdirSync(join(root, 'fixtures/layouts'))
    .filter((name) => name.startsWith('valid-') && name.endsWith('.json'))
    .map((name) => join('fixtures/layouts', name)),
  'fixtures/valid-fill-plan.json',
].sort();

async function fillFixtureToFile(fixturePath: string): Promise<string> {
  const parsed = fillPlanSchema.parse(
    JSON.parse(readFileSync(join(root, fixturePath), 'utf-8')),
  );
  if (parsed.kind !== 'deck') {
    throw new Error(`expected deck fill-plan: ${fixturePath}`);
  }

  const master =
    fixturePath === 'fixtures/valid-fill-plan.json'
      ? join(root, 'templates/PLACEHOLDER-report.master.pptx')
      : join(root, 'templates/report.master.pptx');
  const outputPath = join(mkdtempSync(join(tmpdir(), 'jayson-docs-gate-')), 'filled.pptx');
  const automizer = loadMaster(master);
  for (const section of parsed.sections) {
    for (const slide of section.slides) {
      fillSlide(automizer, slide, parsed.datasets);
    }
  }
  await saveOutput(automizer, outputPath);
  return outputPath;
}

async function tryFillFixtureToFile(fixturePath: string): Promise<string | undefined> {
  try {
    return await fillFixtureToFile(fixturePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not yet supported/i.test(message)) {
      return undefined;
    }
    throw error;
  }
}

async function firstSlideRelsPath(filePath: string): Promise<string> {
  const slidePath = (await activeSlidePaths(await JSZip.loadAsync(await readFile(filePath))))[0];
  if (slidePath === undefined) {
    throw new Error('expected one active slide');
  }
  return `${dirname(slidePath)}/_rels/${basename(slidePath)}.rels`;
}

describe('T-106 — CI output-format regression guard for emitted .pptx', () => {
  it.each(fixturePaths)('passes the gate for fixture-driven output: %s', async (fixturePath) => {
    const outputPath = await tryFillFixtureToFile(fixturePath);
    if (outputPath !== undefined) {
      await assertOutputFormatGate(outputPath);
    }
  });

  it('accepts TargetMode="External" hyperlink relationships', async () => {
    const outputPath = await fillFixtureToFile('fixtures/layouts/valid-title-and-subtitle.json');
    const withExternal = join(dirname(outputPath), 'with-external.pptx');
    writeFileSync(
      withExternal,
      await appendExternalRelationship(
        outputPath,
        await firstSlideRelsPath(outputPath),
        'https://example.com/acme-source',
      ),
    );

    expect(await pptxHasExternalRelationship(withExternal)).toBe(true);
    await assertOutputFormatGate(withExternal);
  });

  it('rejects a corrupted internal relationship with OutputFormatGateError', async () => {
    const outputPath = await fillFixtureToFile('fixtures/layouts/valid-section.json');
    const corruptedPath = join(dirname(outputPath), 'corrupted.pptx');
    writeFileSync(
      corruptedPath,
      await corruptInternalRelationshipTarget(
        outputPath,
        await firstSlideRelsPath(outputPath),
        'rId1',
        '../slideLayouts/missing-layout.xml',
      ),
    );

    await expect(assertOutputFormatGate(corruptedPath)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof OutputFormatGateError &&
        error.message.includes('unresolved internal relationship'),
    );
  });
});

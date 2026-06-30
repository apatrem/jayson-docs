#!/usr/bin/env tsx
/**
 * Emits D26 comfortable-fill bands into skills/report-pptx/layout-catalogue.json
 * and regenerates fixtures/golden/comfortable-fill-calibration.json (all eligible slots).
 * Run after layout-spec or master changes: npx tsx scripts/generate-layout-catalogue-bands.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BANDING_EXCLUDED_SLOTS,
  CHAR_WIDTH_PT,
  deriveBandsForSlot,
  deriveAllFillBands,
  FILL_FRACTION_LOWER,
  FILL_FRACTION_UPPER,
  LINE_HEIGHT_FACTOR,
  LINES_PER_BULLET_ITEM,
  loadLayoutSpec,
  resolveSlotGeometry,
  WORDS_PER_WORD,
} from '../src/setup/comfortable-fill-band.js';
import { collectSlideShapes, extractShapesFromXml, loadPptxZip } from '../src/setup/pptx-shape-utils.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const cataloguePath = join(root, 'skills/report-pptx/layout-catalogue.json');
const goldenPath = join(root, 'fixtures/golden/comfortable-fill-calibration.json');
const masterPath = join(root, 'templates/report.master.pptx');

const catalogue = JSON.parse(readFileSync(cataloguePath, 'utf-8')) as {
  caps: unknown;
  layouts: { layoutId: string; fillBands?: unknown }[];
};

const derived = await deriveAllFillBands();

for (const entry of catalogue.layouts) {
  const fillBands = derived[entry.layoutId];
  if (fillBands !== undefined && Object.keys(fillBands).length > 0) {
    entry.fillBands = fillBands;
  } else {
    delete entry.fillBands;
  }
}

writeFileSync(cataloguePath, `${JSON.stringify(catalogue, null, 2)}\n`);

const CALIBRATION_SUBSET = [
  { layoutId: 'title', slotName: 'slot.body-left' },
  { layoutId: 'narrative-with-sidebar', slotName: 'slot.body-right' },
  { layoutId: 'title-and-content', slotName: 'slot.body-left' },
] as const;

const spec = loadLayoutSpec();
const zip = await loadPptxZip(masterPath);
const masterFile = zip.file('ppt/slideMasters/slideMaster1.xml');
const masterShapes =
  masterFile === null
    ? []
    : extractShapesFromXml(await masterFile.async('string'), 'ppt/slideMasters/slideMaster1.xml');

const goldenEntries: {
  layoutId: string;
  slotName: string;
  geometry: { x: number; y: number; w: number; h: number };
  fontPt: number;
  bands: Record<string, unknown>;
  calibrationRepresentative?: boolean;
}[] = [];

for (const layout of spec.layouts) {
  const shapes = await collectSlideShapes(zip, layout.sourceSlideIndex);
  const used = new Set<typeof masterShapes[number]>();

  for (const slot of layout.slots) {
    if (slot.regionKind !== 'content') {
      continue;
    }
    if (
      BANDING_EXCLUDED_SLOTS.some(
        (excluded) => excluded.layoutId === layout.layoutId && excluded.slotName === slot.slotName,
      )
    ) {
      continue;
    }

    const resolved = resolveSlotGeometry(slot, shapes, used, masterShapes);
    if (resolved === undefined) {
      continue;
    }

    const shape = shapes.find((s) => s.name === slot.slotName);
    if (shape !== undefined) {
      used.add(shape);
    }

    const bands = deriveBandsForSlot(layout.layoutId, slot.slotName, resolved);
    const isCalibration = CALIBRATION_SUBSET.some(
      (c) => c.layoutId === layout.layoutId && c.slotName === slot.slotName,
    );

    goldenEntries.push({
      layoutId: layout.layoutId,
      slotName: slot.slotName,
      geometry: resolved.geometry,
      fontPt: resolved.fontPt ?? 12,
      bands,
      ...(isCalibration ? { calibrationRepresentative: true } : {}),
    });
  }
}

goldenEntries.sort((a, b) =>
  a.layoutId === b.layoutId
    ? a.slotName.localeCompare(b.slotName)
    : a.layoutId.localeCompare(b.layoutId),
);

const golden = {
  description:
    'D26 calibration golden — all 99 eligible body slots with resolved geometry, font pt, and derived bands; 3 flagged calibrationRepresentative.',
  constants: {
    charWidthPt: CHAR_WIDTH_PT,
    lineHeightFactor: LINE_HEIGHT_FACTOR,
    fillFractionLower: FILL_FRACTION_LOWER,
    fillFractionUpper: FILL_FRACTION_UPPER,
    wordsPerWord: WORDS_PER_WORD,
    linesPerBulletItem: LINES_PER_BULLET_ITEM,
  },
  calibrationSubset: CALIBRATION_SUBSET.map((c) => `${c.layoutId}/${c.slotName}`),
  entries: goldenEntries,
};

writeFileSync(goldenPath, `${JSON.stringify(golden, null, 2)}\n`);

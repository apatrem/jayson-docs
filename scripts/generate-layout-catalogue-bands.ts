#!/usr/bin/env tsx
/**
 * Emits D26 comfortable-fill bands into skills/report-pptx/layout-catalogue.json.
 * Run after layout-spec or master changes: npx tsx scripts/generate-layout-catalogue-bands.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveAllFillBands } from '../src/setup/comfortable-fill-band.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const cataloguePath = join(root, 'skills/report-pptx/layout-catalogue.json');

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

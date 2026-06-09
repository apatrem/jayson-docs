#!/usr/bin/env tsx
/**
 * Mechanical OOXML rename: writes approved slot.* names into report.master.pptx.
 * Idempotent — re-running yields the same file.
 *
 *   npx tsx scripts/apply-slot-names.ts
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySlotNames } from '../src/setup/apply-slot-names.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const specPath = join(root, 'src/setup/layout-spec.json');
const masterPath = join(root, 'templates/report.master.pptx');

const result = await applySlotNames(masterPath, specPath);
process.stdout.write(
  `named master written: ${masterPath} (${result.renamed} renamed, ${result.deleted} deleted)\n`,
);

#!/usr/bin/env tsx
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySlotNames } from '../src/setup/apply-slot-names.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const input = process.argv[2] ?? join(root, 'templates/report.master.pptx');
const output = process.argv[3] ?? input;
const specPath = join(root, 'src/setup/layout-spec.json');

const result = await applySlotNames(input, specPath, output);
process.stdout.write(`${result.renamed} renamed, ${result.deleted} deleted → ${output}\n`);

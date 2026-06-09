#!/usr/bin/env tsx
/**
 * scripts/validate.ts — runs the Zod schema against every fixture under
 * /fixtures and reports pass/fail. The valid fixture must parse cleanly;
 * invalid fixtures must fail. Used by `npm run validate`.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema } from '../src/schema/index.js';
import { validateMasterShapes, defaultPaths } from '../src/setup/validate-master.js';
import { generateLayoutSpecFromNamingTable } from './generate-layout-spec.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

function readJson(p: string): unknown {
  return JSON.parse(readFileSync(join(root, p), 'utf-8')) as unknown;
}

function check(label: string, body: () => unknown, expectValid: boolean): boolean {
  try {
    body();
    if (expectValid) {
      process.stdout.write(`PASS  ${label}: valid\n`);
      return true;
    }
    process.stderr.write(`FAIL  ${label}: expected to fail validation, but passed\n`);
    return false;
  } catch (e) {
    if (!expectValid) {
      process.stdout.write(`PASS  ${label}: failed as expected\n`);
      return true;
    }
    process.stderr.write(`FAIL  ${label}: ${String(e)}\n`);
    return false;
  }
}

const valid: [string, string][] = [
  ['fixtures/valid-fill-plan.json', 'deck fill-plan (kpi-row-chart)'],
  ...readdirSync(join(root, 'fixtures/layouts'))
    .filter((f) => f.startsWith('valid-') && f.endsWith('.json'))
    .map((f): [string, string] => [`fixtures/layouts/${f}`, `real layout ${f}`]),
];

const invalid: string[] = [
  'fixtures/invalid/fillplan-title-over-max.json',
  'fixtures/invalid/fillplan-too-many-kpis.json',
  'fixtures/invalid/fillplan-unknown-layout.json',
  'fixtures/invalid/fillplan-unknown-chart-kind.json',
  'fixtures/invalid/fillplan-unknown-key.json',
  'fixtures/invalid/fillplan-bad-dataset-ref.json',
  'fixtures/invalid/fillplan-pie-too-many-rows.json',
  'fixtures/invalid/fillplan-chart-kind-mismatch.json',
  'fixtures/invalid/fillplan-real-layout-unknown-key.json',
  'fixtures/invalid/fillplan-real-chart-bad-dataset-ref.json',
  'fixtures/invalid/fillplan-real-chart-kind-mismatch.json',
  'fixtures/invalid/fillplan-bubble-shape-on-categorical-dataset.json',
  'fixtures/invalid/fillplan-real-title-over-max.json',
  'fixtures/invalid/fillplan-source-over-max.json',
  'fixtures/invalid/fillplan-section-title-cap-violation.json',
  'fixtures/invalid/fillplan-subtitle-cap-violation.json',
  'fixtures/invalid/fillplan-both-dataset-ref-and-inline.json',
  'fixtures/invalid/fillplan-chart-in-content-slot.json',
  'fixtures/invalid/fillplan-null-category.json',
  'fixtures/invalid/fillplan-bubble-dup-columns.json',
  'fixtures/invalid/fillplan-chart-title-cap.json',
  'fixtures/invalid/fillplan-source-cap.json',
  'fixtures/invalid/fillplan-cover-body-cap.json',
  'fixtures/invalid/fillplan-bullets-cap.json',
  'fixtures/invalid/fillplan-text-cap.json',
  'fixtures/invalid/fillplan-callout-cap.json',
  'fixtures/invalid/fillplan-image-caption-cap.json',
  'fixtures/invalid/fillplan-chart-caption-cap.json',
];

let ok = true;
for (const [path, label] of valid) {
  ok = check(`${path} (${label})`, () => fillPlanSchema.parse(readJson(path)), true) && ok;
}
for (const path of invalid) {
  ok = check(path, () => fillPlanSchema.parse(readJson(path)), false) && ok;
}

const namingTablePath = join(root, 'docs/setup/naming-table.md');
const specPathForCheck = join(root, 'src/setup/layout-spec.json');
if (existsSync(namingTablePath) && existsSync(specPathForCheck)) {
  const md = readFileSync(namingTablePath, 'utf-8');
  const generated = `${JSON.stringify(generateLayoutSpecFromNamingTable(md), null, 2)}\n`;
  const committed = readFileSync(specPathForCheck, 'utf-8');
  if (generated === committed) {
    process.stdout.write('PASS  layout-spec.json matches naming table\n');
  } else {
    process.stderr.write('FAIL  layout-spec.json drift (run generate-layout-spec.ts)\n');
    ok = false;
  }
}

const { masterPath, specPath } = defaultPaths();
if (existsSync(masterPath) && existsSync(specPath)) {
  const masterResult = await validateMasterShapes(masterPath, specPath);
  if (masterResult.ok) {
    process.stdout.write('PASS  master shapes ≡ slots\n');
  } else {
    for (const err of masterResult.errors) {
      process.stderr.write(`FAIL  master: ${err}\n`);
    }
    ok = false;
  }
} else {
  process.stderr.write(
    'SKIP  master shapes ≡ slots (templates/report.master.pptx or layout-spec.json missing)\n',
  );
}

if (!ok) {
  process.exit(1);
}
process.stdout.write('\nAll fixture validations behaved as expected.\n');

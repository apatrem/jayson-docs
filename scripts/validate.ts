#!/usr/bin/env tsx
/**
 * scripts/validate.ts — runs the Zod schema against every fixture under
 * /fixtures and reports pass/fail. The valid fixture must parse cleanly;
 * invalid fixtures must fail. Used by `npm run validate`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillPlanSchema } from '../src/schema/index.js';
import { validateMasterShapes, defaultPaths } from '../src/setup/validate-master.js';

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

const valid: [string, string][] = [['fixtures/valid-fill-plan.json', 'deck fill-plan']];

const invalid: string[] = [
  'fixtures/invalid/fillplan-title-too-short.json',
  'fixtures/invalid/fillplan-too-many-kpis.json',
  'fixtures/invalid/fillplan-unknown-layout.json',
  'fixtures/invalid/fillplan-unknown-chart-kind.json',
  'fixtures/invalid/fillplan-unknown-key.json',
  'fixtures/invalid/fillplan-bad-dataset-ref.json',
  'fixtures/invalid/fillplan-pie-too-many-rows.json',
  'fixtures/invalid/fillplan-chart-kind-mismatch.json',
];

let ok = true;
for (const [path, label] of valid) {
  ok = check(`${path} (${label})`, () => fillPlanSchema.parse(readJson(path)), true) && ok;
}
for (const path of invalid) {
  ok = check(path, () => fillPlanSchema.parse(readJson(path)), false) && ok;
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

#!/usr/bin/env tsx
import { validateMasterShapes, defaultPaths } from '../src/setup/validate-master.js';

const masterPath = process.argv[2] ?? defaultPaths().masterPath;
const specPath = process.argv[3] ?? defaultPaths().specPath;
const result = await validateMasterShapes(masterPath, specPath);
if (!result.ok) {
  for (const err of result.errors) {
    process.stderr.write(`${err}\n`);
  }
  process.exit(1);
}
process.stdout.write('master validation OK\n');

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { brandTokensSchema, type BrandTokens } from '../schema/brand.js';

const defaultBrandPath = join(dirname(fileURLToPath(import.meta.url)), 'brand.yaml');

/**
 * Parse and Zod-validate `src/brand/brand.yaml` (or an override path).
 * Precedence: master template > brand.yaml > prose docs (D2-2).
 */
export function loadBrandTokens(path: string = defaultBrandPath): BrandTokens {
  const raw: unknown = parse(readFileSync(path, 'utf-8'));
  return brandTokensSchema.parse(raw);
}

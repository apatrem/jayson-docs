import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { brandTokensSchema, type BrandTokens } from '../schema/brand.js';

const DEFAULT_BRAND_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'brand.yaml');

/**
 * Load + Zod-validate the brand tokens from `brand.yaml` — the validated mirror
 * of the master template (DECISIONS_LOG D2-2). Throws if the file is missing or
 * fails validation. Renderers read tokens (footer confidentiality notice,
 * fonts, colours) from here; the master template remains the brand ground truth.
 */
export function loadBrand(path: string = DEFAULT_BRAND_PATH): BrandTokens {
  const raw: unknown = parseYaml(readFileSync(path, 'utf-8'));
  return brandTokensSchema.parse(raw);
}

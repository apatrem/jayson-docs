import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { brandTokensSchema, type BrandTokens } from '../schema/brand.js';

export const defaultBrandPath = fileURLToPath(new URL('./brand.yaml', import.meta.url));

export function loadBrandTokens(path: string = defaultBrandPath): BrandTokens {
  const raw = readFileSync(path, 'utf-8');
  const parsed = parse(raw) as unknown;

  return brandTokensSchema.parse(parsed);
}

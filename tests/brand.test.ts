import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadBrandTokens } from '../src/brand/load.js';

describe('loadBrandTokens', () => {
  it('parses and validates src/brand/brand.yaml', () => {
    const brand = loadBrandTokens();

    expect(brand.identity.name).toBe('Acme Consulting');
    expect(brand.colors.primary).toBe('#00C259');
    expect(brand.fonts.heading).toContain('Futura');
  });

  it('rejects invalid brand YAML instead of returning partial tokens', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jayson-docs-brand-'));
    const file = join(dir, 'brand.yaml');

    try {
      writeFileSync(file, 'schemaVersion: "1.0.0"\ncolors:\n  primary: nope\n');

      expect(() => loadBrandTokens(file)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

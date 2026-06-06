import { describe, it, expect } from 'vitest';
import { loadBrand } from '../src/brand/load.js';

describe('loadBrand', () => {
  it('loads + Zod-validates src/brand/brand.yaml', () => {
    const brand = loadBrand();
    expect(brand.identity.shortName).toBe('Acme');
    expect(brand.colors.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(brand.fonts.body.length).toBeGreaterThan(0);
  });
});

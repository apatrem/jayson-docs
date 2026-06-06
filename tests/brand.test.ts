import { describe, it, expect } from 'vitest';
import { loadBrandTokens } from '../src/brand/load.js';

describe('loadBrandTokens', () => {
  it('loads and validates src/brand/brand.yaml', () => {
    const tokens = loadBrandTokens();
    expect(tokens.identity.name).toBe('Acme Consulting');
    expect(tokens.colors.primary).toBe('#00C259');
    expect(tokens.schemaVersion).toBe('1.0.0');
  });
});

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { validateMasterShapes, defaultPaths } from '../src/setup/validate-master.js';

const { masterPath, specPath } = defaultPaths();

describe('shapes ≡ slots validator (Phase 2)', () => {
  it('layout-spec.json exists with 26 unique layoutIds', async () => {
    const { readFileSync } = await import('node:fs');
    const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as {
      layouts: { layoutId: string }[];
    };
    expect(spec.layouts).toHaveLength(26);
    const ids = spec.layouts.map((l) => l.layoutId);
    expect(new Set(ids).size).toBe(26);
    expect(ids).toContain('sidebar-callout-inverse');
    expect(ids).toContain('sidebar-callout-hc-inverse');
  });

  it('named master satisfies shapes ≡ slots', async () => {
    expect(existsSync(masterPath)).toBe(true);
    expect(existsSync(specPath)).toBe(true);

    const result = await validateMasterShapes(masterPath, specPath);
    if (!result.ok) {
      throw new Error(`master validation failed:\n${result.errors.join('\n')}`);
    }
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('chart layouts pin pre-authored chart kinds', async () => {
    const result = await validateMasterShapes(masterPath, specPath);
    expect(result.ok).toBe(true);

    const { readFileSync } = await import('node:fs');
    const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as {
      layouts: { layoutId: string; slots: { slotName: string; chartKind?: string }[] }[];
    };
    const chartLayouts = spec.layouts.filter((l) =>
      l.slots.some((s) => s.slotName === 'slot.chart'),
    );
    expect(chartLayouts.map((l) => l.layoutId).sort()).toEqual([
      'chart-bubble',
      'chart-clustered-column',
      'chart-line',
      'chart-stacked-bar',
    ]);
  });
});

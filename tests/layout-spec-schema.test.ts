import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ZodObject, ZodTypeAny } from 'zod';
import { realLayoutSchemas, REAL_LAYOUT_IDS } from '../src/schema/layouts/real-layouts.js';
import type { LayoutSpec } from '../src/setup/types.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(
  readFileSync(join(root, 'src/setup/layout-spec.json'), 'utf-8'),
) as LayoutSpec;

const FILLABLE_REGIONS = new Set([
  'title',
  'section-title',
  'subtitle',
  'chart-title',
  'content',
  'chart',
  'image',
  'source',
]);

const PINNED_CHART_KINDS: Record<string, string> = {
  'chart-stacked-column': 'stacked-column',
  'chart-clustered-column': 'clustered-column',
  'chart-line': 'line',
  'chart-bubble': 'bubble',
};

function slotKey(slotName: string): string {
  return slotName.replace(/^slot\./, '');
}

function schemaKeys(schema: ZodTypeAny): string[] {
  if (!('shape' in schema) || typeof schema.shape !== 'object' || schema.shape === null) {
    throw new Error('expected ZodObject layout schema');
  }
  const shape = (schema as ZodObject).shape;
  return Object.keys(shape).filter((k) => k !== 'layoutId');
}

describe('layout-spec ↔ schema contract (Phase 3.6)', () => {
  it('lists the same 26 layoutIds', () => {
    const specIds = spec.layouts.map((l) => l.layoutId).sort();
    const schemaIds = [...REAL_LAYOUT_IDS].sort();
    expect(specIds).toEqual(schemaIds);
  });

  it('maps every fillable spec slot to a schema key (spec → schema)', () => {
    const schemaById = new Map<string, (typeof realLayoutSchemas)[number]>(
      realLayoutSchemas.map((s) => [s.shape.layoutId.value as string, s]),
    );

    for (const layout of spec.layouts) {
      const schema = schemaById.get(layout.layoutId);
      expect(schema, `missing schema for ${layout.layoutId}`).toBeDefined();
      const keys = new Set(schemaKeys(schema!));

      for (const slot of layout.slots) {
        if (!FILLABLE_REGIONS.has(slot.regionKind)) {
          continue;
        }
        const key = slotKey(slot.slotName);
        expect(keys.has(key), `${layout.layoutId}.${key}`).toBe(true);

        if (slot.regionKind === 'chart' && slot.chartKind !== undefined) {
          expect(PINNED_CHART_KINDS[layout.layoutId]).toBe(slot.chartKind);
          expect(keys.has('chart')).toBe(true);
        }
      }
    }
  });

  it('maps every schema slot key to a spec slot (schema → spec)', () => {
    const specById = new Map(spec.layouts.map((l) => [l.layoutId, l]));

    for (const schema of realLayoutSchemas) {
      const layoutId = schema.shape.layoutId.value;
      const layout = specById.get(layoutId);
      expect(layout, `missing spec for ${layoutId}`).toBeDefined();

      const specSlots = new Map(
        layout!
          .slots.filter((s) => FILLABLE_REGIONS.has(s.regionKind))
          .map((s) => [slotKey(s.slotName), s]),
      );

      for (const key of schemaKeys(schema)) {
        expect(specSlots.has(key), `${layoutId}.${key}`).toBe(true);
      }
    }
  });
});

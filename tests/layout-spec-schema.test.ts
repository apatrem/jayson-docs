import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ZodObject, type ZodTypeAny } from 'zod';
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

const CHART_LAYOUT_IDS = new Set(Object.keys(PINNED_CHART_KINDS));

type SchemaBlockFamily =
  | 'refined-string'
  | 'subtitle-block'
  | 'content-block'
  | 'narrative-block'
  | 'pinned-chart'
  | 'cover-image'
  | 'image-block';

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

interface Zod4Def {
  type?: string;
  values?: unknown[];
  options?: ZodTypeAny[];
  shape?: Record<string, ZodTypeAny>;
}

function zodDef(schema: ZodTypeAny): Zod4Def | undefined {
  return (schema as { _zod?: { def?: Zod4Def } })._zod?.def;
}

function zodType(schema: ZodTypeAny): string | undefined {
  return zodDef(schema)?.type;
}

function objectShape(schema: ZodTypeAny): Record<string, ZodTypeAny> {
  return zodDef(schema)?.shape ?? (schema as ZodObject).shape;
}

function literalValues(schema: ZodTypeAny): string[] {
  const def = zodDef(schema);
  if (def === undefined) {
    return [];
  }
  if (def.type === 'literal' && def.values !== undefined) {
    return def.values.map(String);
  }
  if (def.type === 'union' && def.options !== undefined) {
    return def.options.flatMap((opt) => literalValues(opt));
  }
  if (def.type === 'object' && def.shape !== undefined && 'kind' in def.shape) {
    return literalValues(def.shape.kind);
  }
  return [];
}

function classifySchemaField(field: ZodTypeAny): SchemaBlockFamily {
  const type = zodType(field);

  if (type === 'object') {
    const shape = objectShape(field);
    if ('kind' in shape) {
      return 'pinned-chart';
    }
    if ('ref' in shape) {
      return 'cover-image';
    }
  }

  if (type === 'union') {
    const kinds = literalValues(field);
    if (kinds.includes('image')) {
      return kinds.length === 1 ? 'image-block' : 'content-block';
    }
    if (kinds.includes('text') && kinds.includes('callout') && !kinds.includes('bullets')) {
      return 'subtitle-block';
    }
    if (kinds.includes('bullets') && kinds.includes('text') && kinds.length === 2) {
      return 'narrative-block';
    }
    if (
      kinds.includes('bullets') &&
      kinds.includes('text') &&
      kinds.includes('callout')
    ) {
      return 'content-block';
    }
  }

  if (type === 'string') {
    return 'refined-string';
  }

  throw new Error(`unclassified schema field type: ${type ?? 'unknown'}`);
}

function expectedBlockFamily(
  regionKind: string,
  slotKeyName: string,
  layoutId: string,
): SchemaBlockFamily {
  switch (regionKind) {
    case 'title':
    case 'section-title':
    case 'chart-title':
    case 'source':
      return 'refined-string';
    case 'subtitle':
      return 'subtitle-block';
    case 'chart':
      return 'pinned-chart';
    case 'image':
      return slotKeyName === 'image' ? 'cover-image' : 'image-block';
    case 'content':
      if (
        slotKeyName === 'body' &&
        (layoutId === 'cover' || layoutId === 'cover-white')
      ) {
        return 'refined-string';
      }
      if (slotKeyName === 'body-right' && CHART_LAYOUT_IDS.has(layoutId)) {
        return 'narrative-block';
      }
      return 'content-block';
    default:
      throw new Error(`unexpected regionKind: ${regionKind}`);
  }
}

function chartKindLiteral(field: ZodTypeAny): string {
  const shape = objectShape(field);
  const kindField = shape.kind;
  if (kindField === undefined) {
    throw new Error('expected chart slot to have kind field');
  }
  const values = literalValues(kindField);
  if (values.length !== 1) {
    throw new Error('expected chart slot kind to be a single literal');
  }
  return values[0]!;
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
      const shape = (schema as ZodObject).shape as Record<string, ZodTypeAny>;

      for (const slot of layout.slots) {
        if (!FILLABLE_REGIONS.has(slot.regionKind)) {
          continue;
        }
        const key = slotKey(slot.slotName);
        expect(keys.has(key), `${layout.layoutId}.${key}`).toBe(true);

        const field: ZodTypeAny | undefined = shape[key];
        expect(field, `${layout.layoutId}.${key} missing schema field`).toBeDefined();
        if (field === undefined) {
          continue;
        }

        const family = classifySchemaField(field);
        expect(family).toBe(expectedBlockFamily(slot.regionKind, key, layout.layoutId));

        if (slot.regionKind === 'chart' && slot.chartKind !== undefined) {
          expect(PINNED_CHART_KINDS[layout.layoutId]).toBe(slot.chartKind);
          expect(chartKindLiteral(field)).toBe(slot.chartKind);
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

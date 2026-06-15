/**
 * Maps each banded content slot to the cap-kinds its layout schema accepts.
 * Single source of truth: real-layout Zod schemas (not layout-spec regionKind alone).
 */

import { type ZodObject, type ZodTypeAny } from 'zod';
import { realLayoutSchemas } from '../schema/layouts/real-layouts.js';
import type { EligibleBodyCapKind } from './comfortable-fill-band.js';

const ALL_BODY_CAP_KINDS: EligibleBodyCapKind[] = [
  'content-text',
  'content-bullets',
  'content-callout',
];

const NARRATIVE_CAP_KINDS: EligibleBodyCapKind[] = ['content-text', 'content-bullets'];

function slotKey(slotName: string): string {
  return slotName.replace(/^slot\./, '');
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

/** Classify a content-slot schema field into band-eligible cap kinds (empty = no bands). */
export function capKindsAcceptedBySchemaField(field: ZodTypeAny): EligibleBodyCapKind[] {
  const type = zodType(field);
  if (type === 'union') {
    const kinds = literalValues(field);
    if (kinds.includes('bullets') && kinds.includes('text') && kinds.length === 2) {
      return NARRATIVE_CAP_KINDS;
    }
    if (kinds.includes('bullets') && kinds.includes('text') && kinds.includes('callout')) {
      return ALL_BODY_CAP_KINDS;
    }
  }
  return [];
}

const schemaByLayoutId = new Map<string, ZodObject>(
  realLayoutSchemas.map((s) => [s.shape.layoutId.value as string, s as ZodObject]),
);

/** Cap-kinds whose fill bands may be advertised for this (layoutId, slotName) pair. */
export function acceptedCapKindsForSlot(layoutId: string, slotName: string): EligibleBodyCapKind[] {
  const schema = schemaByLayoutId.get(layoutId);
  if (schema === undefined) {
    return [];
  }
  const key = slotKey(slotName);
  const shape = schema.shape as Record<string, ZodTypeAny>;
  const field = shape[key];
  if (field === undefined) {
    return [];
  }
  return capKindsAcceptedBySchemaField(field);
}

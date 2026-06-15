/**
 * D26 comfortable-fill band deriver — analytic line model from layout-spec geometry.
 * Setup derives bands; skills/report-pptx/layout-catalogue.json is the emitted artifact.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type JSZip from 'jszip';
import { REGION_CAPS, type ComfortableFillBand } from '../schema/caps.js';
import {
  collectSlideShapes,
  extractShapesFromXml,
  loadPptxZip,
  matchShape,
  type ExtractedShape,
} from './pptx-shape-utils.js';
import { acceptedCapKindsForSlot } from './slot-accepted-cap-kinds.js';
import type { LayoutSpec, LayoutSpecEntry, LayoutSlot, ShapeGeometry } from './types.js';

/** D26 cap-kinds eligible for per-box fill bands (fill-time block type picks the band). */
export const ELIGIBLE_BODY_CAP_KINDS = [
  'content-text',
  'content-bullets',
  'content-callout',
] as const;

export type EligibleBodyCapKind = (typeof ELIGIBLE_BODY_CAP_KINDS)[number];

/** Calibrated once against real body boxes (D26). */
export const CHAR_WIDTH_PT = 0.5;
export const LINE_HEIGHT_FACTOR = 1.2;
export const FILL_FRACTION_LOWER = 0.55;
export const FILL_FRACTION_UPPER = 0.85;
export const WORDS_PER_WORD = 6;
export const LINES_PER_BULLET_ITEM = 1.3;

/** D26 excludes cover-body (shortTextString) even though layout-spec tags it regionKind:content. */
export const BANDING_EXCLUDED_SLOTS: readonly { layoutId: string; slotName: string }[] = [
  { layoutId: 'cover', slotName: 'slot.body' },
  { layoutId: 'cover-white', slotName: 'slot.body' },
];

/** Pinned kind→pt defaults from master bodyStyle (D26 hybrid fallback). */
export const BODY_KIND_DEFAULT_PT: Record<EligibleBodyCapKind, number> = {
  'content-text': 12,
  'content-bullets': 12,
  'content-callout': 18,
};

const MASTER_BODY_STYLE_PT = 12;
const MASTER_OTHER_STYLE_PT = 18;

export interface ResolvedSlotGeometry {
  geometry: ShapeGeometry;
  /** Cascade-resolved pt (explicit sz → placeholder/layout/master); undefined when unresolvable. */
  fontPt: number | undefined;
}

export type LayoutFillBands = Record<string, Partial<Record<EligibleBodyCapKind, ComfortableFillBand>>>;

function rootDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../..');
}

export function loadLayoutSpec(): LayoutSpec {
  return JSON.parse(
    readFileSync(join(rootDir(), 'src/setup/layout-spec.json'), 'utf-8'),
  ) as LayoutSpec;
}

function parsePlaceholder(placeholder: string | undefined): {
  type: string | undefined;
  idx: string | undefined;
} {
  if (placeholder === undefined || placeholder.trim() === '') {
    return { type: undefined, idx: undefined };
  }
  const idxMatch = /^idx:(\d+)$/.exec(placeholder.trim());
  if (idxMatch !== null) {
    return { type: undefined, idx: idxMatch[1] };
  }
  return { type: placeholder.trim(), idx: undefined };
}

function fontPtFromShapeBlock(block: string, placeholderType: string | undefined): number | undefined {
  const runSz = /a:rPr[^>]*\bsz="(\d+)"/.exec(block)?.[1];
  if (runSz !== undefined) {
    return Number(runSz) / 100;
  }
  const defSz = /a:defRPr[^>]*\bsz="(\d+)"/.exec(block)?.[1];
  if (defSz !== undefined) {
    return Number(defSz) / 100;
  }
  if (placeholderType === 'body' || placeholderType === undefined) {
    return MASTER_BODY_STYLE_PT;
  }
  return MASTER_OTHER_STYLE_PT;
}

function resolveShapeForSlot(
  shapes: ExtractedShape[],
  slot: LayoutSlot,
  used: Set<ExtractedShape>,
): ExtractedShape | undefined {
  const byName = shapes.find((s) => s.name === slot.slotName);
  if (byName !== undefined) {
    return byName;
  }
  return matchShape(shapes, slot.slotName, slot.match, used);
}

function masterPlaceholderMatch(
  shape: ExtractedShape,
  slot: LayoutSlot,
): boolean {
  const { type: expectedType, idx: expectedIdx } = parsePlaceholder(slot.match.placeholder);
  if (expectedType !== undefined && shape.placeholderType !== expectedType) {
    return false;
  }
  if (expectedIdx !== undefined && shape.placeholderIdx !== expectedIdx) {
    return false;
  }
  return expectedType !== undefined || expectedIdx !== undefined;
}

function resolveInheritedGeometry(
  slot: LayoutSlot,
  shapes: ExtractedShape[],
  masterShapes: ExtractedShape[],
): ShapeGeometry | undefined {
  const recorded = slot.match.geometry;
  if (recorded !== undefined && recorded.w > 0 && recorded.h > 0) {
    return recorded;
  }
  const shape = resolveShapeForSlot(shapes, slot, new Set());
  if (shape?.geometry !== undefined && shape.geometry.w > 0 && shape.geometry.h > 0) {
    return shape.geometry;
  }
  const masterShape = masterShapes.find(
    (s) => s.geometry !== undefined && masterPlaceholderMatch(s, slot),
  );
  return masterShape?.geometry;
}

export function resolveSlotGeometry(
  slot: LayoutSlot,
  shapes: ExtractedShape[],
  used: Set<ExtractedShape>,
  masterShapes: ExtractedShape[] = [],
): ResolvedSlotGeometry | undefined {
  if (slot.regionKind !== 'content') {
    return undefined;
  }

  const shape = resolveShapeForSlot(shapes, slot, used);
  const geometry = resolveInheritedGeometry(slot, shapes, masterShapes);
  if (geometry === undefined || geometry.w <= 0 || geometry.h <= 0) {
    return undefined;
  }

  const fontPt =
    shape !== undefined
      ? fontPtFromShapeBlock(shape.shapeBlock, shape.placeholderType)
      : undefined;
  return { geometry, fontPt };
}

async function loadMasterShapes(zip: JSZip): Promise<ExtractedShape[]> {
  const masterFile = zip.file('ppt/slideMasters/slideMaster1.xml');
  if (masterFile === null) {
    return [];
  }
  return extractShapesFromXml(await masterFile.async('string'), 'ppt/slideMasters/slideMaster1.xml');
}

function lineCapacity(geometry: ShapeGeometry, fontPt: number): { lines: number; charsPerLine: number } {
  const rawLines = Math.floor((geometry.h * 72) / (fontPt * LINE_HEIGHT_FACTOR));
  const rawChars = Math.floor((geometry.w * 72) / (fontPt * CHAR_WIDTH_PT));
  // D27 archetype cells may be shorter than one line at the resolved pt; floor capacity
  // so we never emit a degenerate {0,0} band (D26 omits absent geometry, not zero targets).
  const lines = Math.max(1, rawLines);
  const charsPerLine = Math.max(1, rawChars);
  return { lines, charsPerLine };
}

function rawBand(rawLower: number, rawUpper: number, unit: 'words' | 'items'): ComfortableFillBand {
  const upper = Math.floor(rawUpper);
  if (upper <= 0) {
    // Sub-line boxes can round to zero before clamp; never emit {0,0} (D26 / D27 small cells).
    return { unit, lower: 1, upper: 1 };
  }
  let lower = Math.max(1, Math.floor(rawLower));
  lower = Math.min(lower, upper);
  return { unit, lower, upper };
}

function d23OptimalValue(capKind: EligibleBodyCapKind): number {
  const cap = REGION_CAPS[capKind];
  if (cap.unit === 'words') {
    return cap.optimal.max;
  }
  return cap.optimal.maxItems;
}

// Bands equal D23 [optimal … max] for boxes whose physical capacity exceeds the kind's cap
// (all 26 current layouts' body boxes); they differentiate (sub-cap bands) for smaller boxes —
// the D27 archetype cells (matrix/process/KPI/feature-grid/sub-slots), where per-box fill
// guidance matters. Uniform bands on today's catalogue are expected, not a bug.
function clampBand(
  band: ComfortableFillBand,
  capKind: EligibleBodyCapKind,
): ComfortableFillBand {
  const cap = REGION_CAPS[capKind];
  let { lower, upper } = band;
  const optimal = d23OptimalValue(capKind);

  if (cap.unit === 'words') {
    upper = Math.min(upper, cap.max);
    // Lower clamped down to D23 optimal so D23-optimal content is always in-band (never {max,max}).
    lower = Math.min(lower, optimal);
    lower = Math.min(lower, upper);
    return { unit: 'words', lower, upper };
  }

  if (cap.unit === 'items') {
    upper = Math.min(upper, cap.max.maxItems);
    lower = Math.min(lower, optimal);
    lower = Math.min(lower, upper);
    return { unit: 'items', lower, upper };
  }

  return band;
}

export function deriveBandForKind(
  geometry: ShapeGeometry,
  fontPt: number | undefined,
  capKind: EligibleBodyCapKind,
): ComfortableFillBand {
  const effectivePt = fontPt ?? BODY_KIND_DEFAULT_PT[capKind];
  const { lines, charsPerLine } = lineCapacity(geometry, effectivePt);

  if (capKind === 'content-bullets') {
    const rawCapacity = lines / LINES_PER_BULLET_ITEM;
    const capacity = Math.max(1, rawCapacity);
    return clampBand(
      rawBand(capacity * FILL_FRACTION_LOWER, capacity * FILL_FRACTION_UPPER, 'items'),
      capKind,
    );
  }

  const rawCapacity = (lines * charsPerLine) / WORDS_PER_WORD;
  const capacity = Math.max(1, rawCapacity);
  return clampBand(
    rawBand(capacity * FILL_FRACTION_LOWER, capacity * FILL_FRACTION_UPPER, 'words'),
    capKind,
  );
}

export function deriveBandsForSlot(
  layoutId: string,
  slotName: string,
  resolved: ResolvedSlotGeometry,
): Partial<Record<EligibleBodyCapKind, ComfortableFillBand>> {
  const accepted = acceptedCapKindsForSlot(layoutId, slotName);
  const bands: Partial<Record<EligibleBodyCapKind, ComfortableFillBand>> = {};
  for (const capKind of accepted) {
    bands[capKind] = deriveBandForKind(resolved.geometry, resolved.fontPt, capKind);
  }
  return bands;
}

export async function deriveLayoutFillBands(
  layout: LayoutSpecEntry,
  zip: JSZip,
  masterShapes: ExtractedShape[],
): Promise<LayoutFillBands> {
  const shapes = await collectSlideShapes(zip, layout.sourceSlideIndex);
  const used = new Set<ExtractedShape>();
  const bands: LayoutFillBands = {};

  for (const slot of layout.slots) {
    if (slot.regionKind !== 'content') {
      continue;
    }
    if (
      BANDING_EXCLUDED_SLOTS.some(
        (excluded) => excluded.layoutId === layout.layoutId && excluded.slotName === slot.slotName,
      )
    ) {
      continue;
    }
    const resolved = resolveSlotGeometry(slot, shapes, used, masterShapes);
    if (resolved === undefined) {
      continue;
    }
    const shape = resolveShapeForSlot(shapes, slot, used);
    if (shape !== undefined) {
      used.add(shape);
    }
    bands[slot.slotName] = deriveBandsForSlot(layout.layoutId, slot.slotName, resolved);
  }

  return bands;
}

export async function deriveAllFillBands(
  spec: LayoutSpec = loadLayoutSpec(),
  masterPath = join(rootDir(), 'templates/report.master.pptx'),
): Promise<Record<string, LayoutFillBands>> {
  const zip = await loadPptxZip(masterPath);
  const masterShapes = await loadMasterShapes(zip);
  const result: Record<string, LayoutFillBands> = {};
  for (const layout of spec.layouts) {
    result[layout.layoutId] = await deriveLayoutFillBands(layout, zip, masterShapes);
  }
  return result;
}

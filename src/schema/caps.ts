/**
 * Two-tier density caps — single source for Zod (absolute max) and CLI (optimal guidance).
 * Phase 4 catalogue will mirror these values; a drift test keeps them in sync.
 */

export type CapUnit = 'words' | 'items' | 'chars';

export interface WordRangeOptimal {
  kind: 'word-range';
  min: number;
  max: number;
}

export interface WordMaxOptimal {
  kind: 'word-max';
  max: number;
}

export interface CharMaxOptimal {
  kind: 'char-max';
  max: number;
}

export interface BulletSetBounds {
  maxItems: number;
  maxWords: number;
}

export interface BulletSetOptimal extends BulletSetBounds {
  kind: 'bullet-set';
}

export type OptimalSpec = WordRangeOptimal | WordMaxOptimal | CharMaxOptimal | BulletSetOptimal;

export interface WordRegionCap {
  unit: 'words';
  optimal: WordRangeOptimal | WordMaxOptimal;
  max: number;
}

export interface CharRegionCap {
  unit: 'chars';
  optimal: CharMaxOptimal;
  max: number;
}

export interface BulletRegionCap {
  unit: 'items';
  optimal: BulletSetOptimal;
  max: BulletSetBounds;
}

export type RegionCap = WordRegionCap | CharRegionCap | BulletRegionCap;

/** D26 — per-box comfortable-fill target beneath D23 caps (values live in the catalogue). */
export interface ComfortableFillBand {
  unit: Extract<CapUnit, 'words' | 'items'>;
  lower: number;
  upper: number;
}

export const REGION_CAPS = {
  title: {
    unit: 'words',
    optimal: { kind: 'word-range', min: 8, max: 15 },
    max: 20,
  },
  'section-title': {
    unit: 'words',
    optimal: { kind: 'word-max', max: 8 },
    max: 12,
  },
  subtitle: {
    unit: 'words',
    optimal: { kind: 'word-max', max: 25 },
    max: 40,
  },
  'chart-title': {
    unit: 'words',
    optimal: { kind: 'word-max', max: 15 },
    max: 25,
  },
  source: {
    unit: 'words',
    optimal: { kind: 'word-max', max: 40 },
    max: 80,
  },
  'cover-body': {
    unit: 'words',
    optimal: { kind: 'word-max', max: 25 },
    max: 40,
  },
  'content-bullets': {
    unit: 'items',
    optimal: { kind: 'bullet-set', maxItems: 5, maxWords: 60 },
    max: { maxItems: 8, maxWords: 100 },
  },
  'content-text': {
    unit: 'words',
    optimal: { kind: 'word-max', max: 60 },
    max: 100,
  },
  'content-callout': {
    unit: 'words',
    optimal: { kind: 'word-max', max: 25 },
    max: 40,
  },
  caption: {
    unit: 'chars',
    optimal: { kind: 'char-max', max: 120 },
    max: 200,
  },
  'pie-doughnut-rows': {
    unit: 'items',
    optimal: { kind: 'bullet-set', maxItems: 8, maxWords: 8 },
    max: { maxItems: 8, maxWords: 8 },
  },
} as const satisfies Record<string, RegionCap>;

export type RegionKey = keyof typeof REGION_CAPS;

export function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

export function formatOptimalLabel(region: RegionKey): string {
  const cap = REGION_CAPS[region];
  if (cap.optimal.kind === 'word-range') {
    return `${cap.optimal.min}–${cap.optimal.max}`;
  }
  if (cap.optimal.kind === 'word-max') {
    return `≤${cap.optimal.max}`;
  }
  if (cap.optimal.kind === 'char-max') {
    return `≤${cap.optimal.max}`;
  }
  return `≤${cap.optimal.maxItems} items / ≤${cap.optimal.maxWords} words`;
}

export function isWithinOptimalWords(text: string, cap: WordRegionCap): boolean {
  const count = wordCount(text);
  if (cap.optimal.kind === 'word-range') {
    return count >= cap.optimal.min && count <= cap.optimal.max;
  }
  return count <= cap.optimal.max;
}

function formatMaxLabel(region: RegionKey): string {
  const cap = REGION_CAPS[region];
  if (cap.unit === 'items') {
    const bounds = cap.max as BulletSetBounds;
    return `≤${bounds.maxItems} items / ${bounds.maxWords} words`;
  }
  return String(cap.max);
}

export function formatDensityWarning(
  field: string,
  measured: number,
  unit: string,
  region: RegionKey,
): string {
  const optimal = formatOptimalLabel(region);
  const maxLabel = formatMaxLabel(region);
  return `warning: ${field} is ${measured} ${unit} (optimal ${optimal}, max ${maxLabel})`;
}

export function formatFillBandWarning(
  layoutId: string,
  region: string,
  direction: 'under-fill' | 'over-fill',
  measured: number,
  band: ComfortableFillBand,
): string {
  return `warning: slide "${layoutId}" ${region} ${direction}: ${measured} ${band.unit} (fill-band ${band.lower}–${band.upper})`;
}

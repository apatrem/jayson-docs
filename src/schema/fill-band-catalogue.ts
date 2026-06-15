/**
 * D26 fill-band lookup — runtime reads bands from the Setup-derived catalogue (not the deriver).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComfortableFillBand } from './caps.js';

export type BodyCapKind = 'content-text' | 'content-bullets' | 'content-callout';

interface CatalogueLayout {
  layoutId: string;
  fillBands?: Record<string, Partial<Record<BodyCapKind, ComfortableFillBand>>>;
}

interface LayoutCatalogue {
  layouts: CatalogueLayout[];
}

type LayoutFillBands = Record<string, Partial<Record<BodyCapKind, ComfortableFillBand>>>;

let cached: Map<string, LayoutFillBands> | undefined;

function rootDir(): string {
  return join(dirname(fileURLToPath(import.meta.url)), '../..');
}

function loadCatalogueFillBands(): Map<string, LayoutFillBands> {
  if (cached === undefined) {
    const catalogue = JSON.parse(
      readFileSync(join(rootDir(), 'skills/report-pptx/layout-catalogue.json'), 'utf-8'),
    ) as LayoutCatalogue;
    cached = new Map(
      catalogue.layouts
        .filter((entry) => entry.fillBands !== undefined)
        .map((entry) => [entry.layoutId, entry.fillBands!]),
    );
  }
  return cached;
}

/** Look up the D26 comfortable-fill band for a (layout, region, cap-kind) triple. */
export function lookupFillBand(
  layoutId: string,
  regionKey: string,
  capKind: BodyCapKind,
): ComfortableFillBand | undefined {
  const layoutBands = loadCatalogueFillBands().get(layoutId);
  if (layoutBands === undefined) {
    return undefined;
  }
  return layoutBands[`slot.${regionKey}`]?.[capKind];
}

/** @internal Test hook — reset cached catalogue between tests. */
export function resetFillBandCatalogueCache(): void {
  cached = undefined;
}

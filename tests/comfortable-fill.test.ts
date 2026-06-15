import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComfortableFillBand } from '../src/schema/caps.js';
import {
  deriveAllFillBands,
  deriveBandForKind,
  deriveBandsForSlot,
  ELIGIBLE_BODY_CAP_KINDS,
  loadLayoutSpec,
  resolveSlotGeometry,
} from '../src/setup/comfortable-fill-band.js';
import { collectSlideShapes, loadPptxZip, extractShapesFromXml } from '../src/setup/pptx-shape-utils.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p: string): unknown => JSON.parse(readFileSync(join(root, p), 'utf-8'));

describe('D26 comfortable-fill bands (T-201)', () => {
  it('exports ComfortableFillBand type with lower/upper in the region unit', () => {
    const band: ComfortableFillBand = { unit: 'words', lower: 40, upper: 70 };
    expect(band.lower).toBeLessThanOrEqual(band.upper);
    expect(['words', 'items']).toContain(band.unit);
  });

  it('derives different word bands for body boxes with differing footprints', () => {
    const wide = deriveBandForKind(
      { x: 0.602, y: 1.231, w: 12.128, h: 5.59 },
      12,
      'content-text',
    );
    const narrow = deriveBandForKind(
      { x: 10.053, y: 1.746, w: 2.678, h: 5.075 },
      12,
      'content-text',
    );
    const compact = deriveBandForKind({ x: 0.6, y: 3.855, w: 4.389, h: 0.446 }, 12, 'content-text');
    expect(wide).toEqual({ unit: 'words', lower: 60, upper: 100 });
    expect(narrow).toEqual({ unit: 'words', lower: 60, upper: 100 });
    expect(compact).toEqual({ unit: 'words', lower: 9, upper: 14 });
    expect(compact.upper).toBeLessThan(wide.lower);
  });

  it('differentiates sub-cap bands for a synthetic small box (D27 matrix/process cell)', () => {
    // No current layout slot is this small; D27 archetypes (matrix cells, process/KPI/funnel/
    // feature-grid boxes, sub-slotted cells) will. Proves the deriver emits real sub-cap bands,
    // not just D23 [optimal, max], when physical capacity is below the kind cap.
    const d27Cell = deriveBandForKind({ x: 0, y: 0, w: 2.5, h: 1.5 }, 12, 'content-text');
    expect(d27Cell.lower).toBeGreaterThan(0);
    expect(d27Cell.lower).toBeLessThanOrEqual(d27Cell.upper);
    expect(d27Cell.upper).toBeLessThan(100);
    expect(d27Cell.lower).toBeLessThan(60);
    expect(d27Cell).toEqual({ unit: 'words', lower: 19, upper: 29 });
  });

  it('never advertises a band upper above the D23 max', () => {
    const maxByKind = {
      'content-text': 100,
      'content-bullets': 8,
      'content-callout': 40,
    } as const;
    for (const kind of ELIGIBLE_BODY_CAP_KINDS) {
      const band = deriveBandForKind({ x: 0.6, y: 1.2, w: 12, h: 5.5 }, 12, kind);
      expect(band.lower).toBeLessThanOrEqual(band.upper);
      expect(band.upper).toBeLessThanOrEqual(maxByKind[kind]);
    }
  });

  it('matches the calibration golden for representative body slots', async () => {
    const golden = readJson('fixtures/golden/comfortable-fill-calibration.json') as {
      entries: {
        layoutId: string;
        slotName: string;
        geometry: { x: number; y: number; w: number; h: number };
        fontPt: number;
        bands: Record<string, ComfortableFillBand>;
      }[];
    };
    const spec = loadLayoutSpec();
    const zip = await loadPptxZip(join(root, 'templates/report.master.pptx'));
    const masterFile = zip.file('ppt/slideMasters/slideMaster1.xml');
    const masterShapes =
      masterFile === null
        ? []
        : extractShapesFromXml(await masterFile.async('string'), 'ppt/slideMasters/slideMaster1.xml');

    for (const entry of golden.entries) {
      const layout = spec.layouts.find((l) => l.layoutId === entry.layoutId);
      const slot = layout?.slots.find((s) => s.slotName === entry.slotName);
      expect(slot).toBeDefined();
      if (!slot) continue;
      const shapes = await collectSlideShapes(zip, layout?.sourceSlideIndex ?? 0);
      const resolved = resolveSlotGeometry(slot, shapes, new Set(), masterShapes);
      expect(resolved).toEqual({ geometry: entry.geometry, fontPt: entry.fontPt });
      expect(deriveBandsForSlot(resolved!)).toEqual(entry.bands);
    }
  });

  it('keeps layout-catalogue fillBands in sync with the deriver (drift guard)', async () => {
    const catalogue = readJson('skills/report-pptx/layout-catalogue.json') as {
      layouts: { layoutId: string; fillBands?: Record<string, Record<string, ComfortableFillBand>> }[];
    };
    const derived = await deriveAllFillBands();
    for (const entry of catalogue.layouts) {
      expect(entry.fillBands ?? {}).toEqual(derived[entry.layoutId] ?? {});
    }
  });

  it('does not band cover-body slots (cover / cover-white slot.body)', async () => {
    const derived = await deriveAllFillBands();
    expect(derived.cover?.['slot.body']).toBeUndefined();
    expect(derived['cover-white']?.['slot.body']).toBeUndefined();
  });

  it('does not band heading regions (e.g. section slot.section-title)', async () => {
    const derived = await deriveAllFillBands();
    expect(derived.section?.['slot.section-title']).toBeUndefined();
  });
});

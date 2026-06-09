import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import JSZip from 'jszip';
import { applySlotNames } from '../src/setup/apply-slot-names.js';
import { validateMasterShapes, defaultPaths } from '../src/setup/validate-master.js';
import {
  collectSlideShapes,
  extractShapesFromXml,
  loadPptxZip,
  renameShapeBlock,
  replaceShapeBlockInXml,
} from '../src/setup/pptx-shape-utils.js';
import { generateLayoutSpecFromNamingTable } from '../scripts/generate-layout-spec.js';

const { masterPath, specPath } = defaultPaths();
const root = join(masterPath, '..', '..');

describe('shapes ≡ slots validator (Phase 3.6)', () => {
  it('layout-spec.json exists with 26 unique layoutIds', () => {
    const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as {
      layouts: { layoutId: string }[];
    };
    expect(spec.layouts).toHaveLength(26);
    const ids = spec.layouts.map((l) => l.layoutId);
    expect(new Set(ids).size).toBe(26);
    expect(ids).toContain('chart-stacked-column');
    expect(ids).toContain('sidebar-callout-inverse');
    expect(ids).toContain('sidebar-callout-hc-inverse');
  });

  it('layout-spec.json matches naming table (drift check)', () => {
    const md = readFileSync(join(root, 'docs/setup/naming-table.md'), 'utf-8');
    const generated = JSON.stringify(generateLayoutSpecFromNamingTable(md), null, 2);
    const committed = readFileSync(specPath, 'utf-8').trimEnd();
    expect(generated.trimEnd()).toBe(committed);
  });

  it('named master satisfies shapes ≡ slots', async () => {
    expect(existsSync(masterPath)).toBe(true);
    const result = await validateMasterShapes(masterPath, specPath);
    if (!result.ok) {
      throw new Error(`master validation failed:\n${result.errors.join('\n')}`);
    }
    expect(result.ok).toBe(true);
  });

  it('chart layouts pin pre-authored chart kinds on slot.chart shape', () => {
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
      'chart-stacked-column',
    ]);
  });

  it('rejects duplicate slot names in spec (slide 11 pre-fix state)', async () => {
    const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as {
      layouts: { layoutId: string; sourceSlideIndex: number; slots: { slotName: string }[] }[];
    };
    const broken = structuredClone(spec);
    const twoCol = broken.layouts.find((l) => l.layoutId === 'two-columns');
    expect(twoCol).toBeDefined();
    for (const slot of twoCol!.slots) {
      if (slot.slotName === 'slot.body-right') {
        slot.slotName = 'slot.body-left';
      }
    }
    const tmpSpec = join(mkdtempSync(join(tmpdir(), 'jd-spec-')), 'layout-spec.json');
    writeFileSync(tmpSpec, JSON.stringify(broken, null, 2));
    const result = await validateMasterShapes(masterPath, tmpSpec);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicate slot names'))).toBe(true);
  });

  it('rejects chart/name swap on slide 7 (chart disassociated from slot.chart)', async () => {
    const zip = await loadPptxZip(masterPath);
    const slideIndex = 7;
    const shapes = await collectSlideShapes(zip, slideIndex);
    const chart = shapes.find((s) => s.name === 'slot.chart');
    const bodyRight = shapes.find((s) => s.name === 'slot.body-right');
    expect(chart).toBeDefined();
    expect(bodyRight).toBeDefined();

    const slidePath = `ppt/slides/slide${slideIndex}.xml`;
    const slideFile = zip.file(slidePath);
    let slideXml = await slideFile!.async('string');
    slideXml = replaceShapeBlockInXml(
      slideXml,
      chart!.shapeBlock,
      renameShapeBlock(chart!.shapeBlock, 'slot.body-right'),
    );
    slideXml = replaceShapeBlockInXml(
      slideXml,
      bodyRight!.shapeBlock,
      renameShapeBlock(bodyRight!.shapeBlock, 'slot.chart'),
    );
    zip.file(slidePath, slideXml);

    const tmpMaster = join(mkdtempSync(join(tmpdir(), 'jd-master-')), 'mutated.pptx');
    writeFileSync(
      tmpMaster,
      await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }),
    );

    const result = await validateMasterShapes(tmpMaster, specPath);
    expect(result.ok).toBe(false);
    expect(
      result.errors.some(
        (e) => e.includes('slot.chart') && e.includes('stacked-column'),
      ),
    ).toBe(true);
  });

  it('replays apply-slot-names from Phase-1 master with correct semantics', async () => {
    const preDir = mkdtempSync(join(tmpdir(), 'jd-pre-'));
    const preNaming = join(preDir, 'pre-naming.pptx');
    writeFileSync(
      preNaming,
      execSync('git cat-file blob 7ea5553:templates/report.master.pptx', {
        cwd: root,
        encoding: 'buffer',
        maxBuffer: 10 * 1024 * 1024,
      }),
    );

    const outDir = mkdtempSync(join(tmpdir(), 'jd-replay-'));
    const replayed = join(outDir, 'replayed.pptx');
    const result = await applySlotNames(preNaming, specPath, replayed);
    expect(result.deleted).toBe(1);

    const validation = await validateMasterShapes(replayed, specPath);
    if (!validation.ok) {
      throw new Error(validation.errors.join('\n'));
    }

    const zip = await JSZip.loadAsync(readFileSync(replayed));
    const slide6 = await zip.file('ppt/slides/slide6.xml')!.async('string');
    expect(slide6).not.toMatch(/Espace réservé du contenu 5/);
    expect(slide6).not.toMatch(/qsdf/);

    const layout16 = await zip.file('ppt/slideLayouts/slideLayout16.xml')!.async('string');
    const idx3Shape = extractShapesFromXml(layout16, 'ppt/slideLayouts/slideLayout16.xml').find(
      (s) => s.placeholderIdx === '3',
    );
    expect(idx3Shape?.name).toBe('slot.subtitle-2');
  });

  it('apply-slot-names is idempotent on the committed master', async () => {
    const copy = join(mkdtempSync(join(tmpdir(), 'jd-idem-')), 'master.pptx');
    writeFileSync(copy, readFileSync(masterPath));
    const first = await applySlotNames(copy, specPath, copy);
    const second = await applySlotNames(copy, specPath, copy);
    expect(first.renamed).toBe(0);
    expect(first.deleted).toBe(0);
    expect(second.renamed).toBe(0);
    expect(second.deleted).toBe(0);
  });
});

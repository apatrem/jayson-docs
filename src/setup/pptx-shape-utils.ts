import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import type { ShapeGeometry, ShapeMatch } from './types.js';

const EMU_PER_INCH = 914_400;
const GEOM_TOLERANCE_IN = 0.05;

export interface ExtractedShape {
  name: string;
  placeholderType: string | undefined;
  placeholderIdx: string | undefined;
  geometry: ShapeGeometry | undefined;
  masterText: string;
  isChart: boolean;
  /** slide XML path or layout XML part path */
  sourcePart: string;
  /** The enclosing <p:sp>, <p:graphicFrame>, or <p:pic> XML fragment */
  shapeBlock: string;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emuToInches(emu: string): number {
  return Math.round((Number(emu) / EMU_PER_INCH) * 1000) / 1000;
}

function parseGeometry(block: string): ShapeGeometry | undefined {
  const off = /<a:off[^>]*x="(\d+)"[^>]*y="(\d+)"/.exec(block);
  const ext = /<a:ext[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(block);
  if (off === null || ext === null) {
    return undefined;
  }
  return {
    x: emuToInches(off[1] ?? '0'),
    y: emuToInches(off[2] ?? '0'),
    w: emuToInches(ext[1] ?? '0'),
    h: emuToInches(ext[2] ?? '0'),
  };
}

function parsePlaceholder(block: string): { type: string | undefined; idx: string | undefined } {
  const ph = /<p:ph\s+([^/>]+)\/>/.exec(block) ?? /<p:ph\s+([^>]+)>/.exec(block);
  if (ph === null) {
    return { type: undefined, idx: undefined };
  }
  const attrs = ph[1] ?? '';
  const type = /type="([^"]+)"/.exec(attrs)?.[1];
  const idx = /idx="([^"]+)"/.exec(attrs)?.[1];
  return { type, idx };
}

function extractText(block: string): string {
  return [...block.matchAll(/<a:t(?:[^>]*)>([^<]*)<\/a:t>/g)]
    .map((m) => m[1] ?? '')
    .join('')
    .trim();
}

function shapeBlocks(xml: string): string[] {
  return [
    ...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g),
    ...xml.matchAll(/<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/g),
    ...xml.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g),
  ].map((m) => m[0]);
}

export function extractShapesFromXml(xml: string, sourcePart: string): ExtractedShape[] {
  const shapes: ExtractedShape[] = [];
  for (const block of shapeBlocks(xml)) {
    const nameMatch = /<p:cNvPr[^>]*name="([^"]*)"/.exec(block);
    if (nameMatch === null) {
      continue;
    }
    const name = nameMatch[1] ?? '';
    if (name === '') {
      continue;
    }
    const { type, idx } = parsePlaceholder(block);
    shapes.push({
      name,
      placeholderType: type,
      placeholderIdx: idx,
      geometry: parseGeometry(block),
      masterText: extractText(block),
      isChart: block.includes('<c:chart') || block.includes('graphicFrame'),
      sourcePart,
      shapeBlock: block,
    });
  }
  return shapes;
}

export function placeholderKey(
  placeholderType: string | undefined,
  placeholderIdx: string | undefined,
): string | undefined {
  if (placeholderType === undefined && placeholderIdx === undefined) {
    return undefined;
  }
  return `${placeholderType ?? ''}#${placeholderIdx ?? ''}`;
}

function normalizePlaceholder(placeholder: string | undefined): {
  type: string | undefined;
  idx: string | undefined;
} {
  if (placeholder === undefined || placeholder === '—' || placeholder.trim() === '') {
    return { type: undefined, idx: undefined };
  }
  const idxMatch = /^idx:(\d+)$/.exec(placeholder.trim());
  if (idxMatch !== null) {
    return { type: undefined, idx: idxMatch[1] };
  }
  if (placeholder === 'chart') {
    return { type: 'chart', idx: undefined };
  }
  return { type: placeholder.trim(), idx: undefined };
}

function geometryMatches(a: ShapeGeometry | undefined, b: ShapeGeometry | undefined): boolean {
  if (a === undefined || b === undefined) {
    return true;
  }
  return (
    Math.abs(a.x - b.x) <= GEOM_TOLERANCE_IN &&
    Math.abs(a.y - b.y) <= GEOM_TOLERANCE_IN &&
    Math.abs(a.w - b.w) <= GEOM_TOLERANCE_IN &&
    Math.abs(a.h - b.h) <= GEOM_TOLERANCE_IN
  );
}

function masterTextMatches(
  shapeText: string,
  expected: string | undefined,
  strict: boolean,
): boolean {
  if (expected === undefined || expected === '—' || expected.trim() === '') {
    return true;
  }
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const shapeNorm = norm(shapeText);
  const expectedNorm = norm(expected);
  if (shapeNorm === '') {
    return !strict;
  }
  if (!strict) {
    return true;
  }
  return shapeNorm.startsWith(expectedNorm) || expectedNorm.startsWith(shapeNorm);
}

function placeholderMatches(
  shape: ExtractedShape,
  expectedType: string | undefined,
  expectedIdx: string | undefined,
): boolean {
  if (expectedType === undefined && expectedIdx === undefined) {
    return true;
  }
  if (expectedType !== undefined && shape.placeholderType !== expectedType) {
    return false;
  }
  if (expectedIdx !== undefined && shape.placeholderIdx !== expectedIdx) {
    return false;
  }
  return true;
}

function criteriaSupplied(criteria: ShapeMatch): boolean {
  const { type, idx } = normalizePlaceholder(criteria.placeholder);
  return (
    criteria.currentShapeName !== '' ||
    type !== undefined ||
    idx !== undefined ||
    (criteria.masterText !== undefined &&
      criteria.masterText !== '—' &&
      criteria.masterText.trim() !== '') ||
    criteria.geometry !== undefined
  );
}

function shapeMatchesCriteria(
  shape: ExtractedShape,
  criteria: ShapeMatch,
  strictMasterText: boolean,
): boolean {
  const { type: expectedType, idx: expectedIdx } = normalizePlaceholder(criteria.placeholder);

  if (criteria.currentShapeName !== '' && shape.name !== criteria.currentShapeName) {
    return false;
  }
  if (!placeholderMatches(shape, expectedType, expectedIdx)) {
    return false;
  }
  if (!masterTextMatches(shape.masterText, criteria.masterText, strictMasterText)) {
    return false;
  }
  if (!geometryMatches(shape.geometry, criteria.geometry)) {
    return false;
  }
  return true;
}

/** Verify a named shape still matches spec placeholder/geometry (ignores legacy currentShapeName). */
export function shapeMatchesSlotCriteria(
  shape: ExtractedShape,
  match: ShapeMatch,
  options?: { strictMasterText?: boolean },
): boolean {
  const criteria: ShapeMatch = { ...match, currentShapeName: '' };
  return shapeMatchesCriteria(shape, criteria, options?.strictMasterText ?? false);
}

export function matchShape(
  shapes: ExtractedShape[],
  slotName: string,
  criteria: ShapeMatch,
  alreadyUsed: Set<ExtractedShape>,
  options?: { strictMasterText?: boolean },
): ExtractedShape | undefined {
  const strictMasterText = options?.strictMasterText ?? false;
  const alreadyNamed = shapes.find((s) => s.name === slotName && !alreadyUsed.has(s));
  if (alreadyNamed !== undefined) {
    if (shapeMatchesSlotCriteria(alreadyNamed, criteria, { strictMasterText })) {
      return alreadyNamed;
    }
    return undefined;
  }

  if (!criteriaSupplied(criteria)) {
    return undefined;
  }

  const candidates = shapes.filter(
    (s) => !alreadyUsed.has(s) && shapeMatchesCriteria(s, criteria, strictMasterText),
  );

  if (candidates.length === 1) {
    return candidates[0];
  }

  return undefined;
}

export async function loadPptxZip(pptxPath: string): Promise<JSZip> {
  return JSZip.loadAsync(await readFile(pptxPath));
}

export async function getSlideLayoutPath(
  zip: JSZip,
  slideIndex: number,
): Promise<string | undefined> {
  const relsPath = `ppt/slides/_rels/slide${slideIndex}.xml.rels`;
  const relsFile = zip.file(relsPath);
  if (relsFile === null) {
    return undefined;
  }
  const relsXml = await relsFile.async('string');
  const target = /Target="\.\.\/slideLayouts\/([^"]+)"/.exec(relsXml)?.[1];
  return target === undefined ? undefined : `ppt/slideLayouts/${target}`;
}

export async function collectSlideShapes(
  zip: JSZip,
  slideIndex: number,
): Promise<ExtractedShape[]> {
  const slidePath = `ppt/slides/slide${slideIndex}.xml`;
  const slideFile = zip.file(slidePath);
  if (slideFile === null) {
    throw new Error(`slide not found: ${slidePath}`);
  }
  const slideXml = await slideFile.async('string');
  const shapes = extractShapesFromXml(slideXml, slidePath);

  const layoutPath = await getSlideLayoutPath(zip, slideIndex);
  if (layoutPath !== undefined) {
    const layoutFile = zip.file(layoutPath);
    if (layoutFile !== null) {
      const layoutXml = await layoutFile.async('string');
      const layoutShapes = extractShapesFromXml(layoutXml, layoutPath);
      const slidePlaceholderKeys = new Set(
        shapes
          .map((s) => placeholderKey(s.placeholderType, s.placeholderIdx))
          .filter((k): k is string => k !== undefined),
      );
      for (const ls of layoutShapes) {
        const key = placeholderKey(ls.placeholderType, ls.placeholderIdx);
        if (key !== undefined && slidePlaceholderKeys.has(key)) {
          continue;
        }
        shapes.push(ls);
      }
    }
  }

  return shapes;
}

function chartKindFromXml(chartXml: string): string | undefined {
  if (chartXml.includes('bubbleChart')) {
    return 'bubble';
  }
  if (chartXml.includes('lineChart')) {
    return 'line';
  }
  if (chartXml.includes('barChart')) {
    const isStacked = chartXml.includes('grouping val="stacked"');
    const barDirBar = chartXml.includes('barDir val="bar"');
    const barDirCol = chartXml.includes('barDir val="col"') || !barDirBar;

    if (isStacked && barDirCol) {
      return 'stacked-column';
    }
    if (isStacked && barDirBar) {
      return 'stacked-bar';
    }
    if (barDirCol) {
      return 'clustered-column';
    }
    return 'bar';
  }
  return undefined;
}

/** Resolve the pinned chart kind from a specific chart-bearing shape block. */
export async function readChartKindFromShape(
  zip: JSZip,
  shape: ExtractedShape,
): Promise<string | undefined> {
  if (!shape.isChart) {
    return undefined;
  }

  const chartRId = /<c:chart[^>]*r:id="([^"]+)"/.exec(shape.shapeBlock)?.[1];
  if (chartRId === undefined) {
    return undefined;
  }

  const slideRels = /^ppt\/slides\/(slide\d+)\.xml$/.exec(shape.sourcePart);
  const layoutRels = /^ppt\/slideLayouts\/(slideLayout\d+)\.xml$/.exec(shape.sourcePart);
  const relsPath =
    slideRels !== null
      ? `ppt/slides/_rels/${slideRels[1]}.xml.rels`
      : layoutRels !== null
        ? `ppt/slideLayouts/_rels/${layoutRels[1]}.xml.rels`
        : undefined;
  if (relsPath === undefined) {
    return undefined;
  }

  const relsFile = zip.file(relsPath);
  if (relsFile === null) {
    return undefined;
  }

  const relsXml = await relsFile.async('string');
  const target = new RegExp(`Id="${escapeRegex(chartRId)}"[^>]*Target="([^"]+)"`).exec(
    relsXml,
  )?.[1];
  if (target === undefined) {
    return undefined;
  }

  const chartPath = `ppt/${target.replace(/^\.\.\//, '')}`;
  const chartFile = zip.file(chartPath);
  if (chartFile === null) {
    return undefined;
  }

  return chartKindFromXml(await chartFile.async('string'));
}

export async function readChartKind(
  zip: JSZip,
  slideIndex: number,
): Promise<string | undefined> {
  const slidePath = `ppt/slides/slide${slideIndex}.xml`;
  const relsPath = `ppt/slides/_rels/slide${slideIndex}.xml.rels`;
  const slideFile = zip.file(slidePath);
  const relsFile = zip.file(relsPath);
  if (slideFile === null || relsFile === null) {
    return undefined;
  }
  const slideXml = await slideFile.async('string');
  const relsXml = await relsFile.async('string');
  const chartRId = /<c:chart[^>]*r:id="([^"]+)"/.exec(slideXml)?.[1];
  if (chartRId === undefined) {
    return undefined;
  }
  const target = new RegExp(`Id="${escapeRegex(chartRId)}"[^>]*Target="([^"]+)"`).exec(
    relsXml,
  )?.[1];
  if (target === undefined) {
    return undefined;
  }
  const chartPath = `ppt/${target.replace(/^\.\.\//, '')}`;
  const chartFile = zip.file(chartPath);
  if (chartFile === null) {
    return undefined;
  }
  return chartKindFromXml(await chartFile.async('string'));
}

export function renameShapeBlock(shapeBlock: string, newName: string): string {
  return shapeBlock.replace(
    /(<p:cNvPr[^>]*name=")[^"]*(")/,
    `$1${newName}$2`,
  );
}

export function replaceShapeBlockInXml(
  xml: string,
  oldBlock: string,
  newBlock: string,
): string {
  const index = xml.indexOf(oldBlock);
  if (index === -1) {
    throw new Error('shape block not found in OOXML part');
  }
  return xml.slice(0, index) + newBlock + xml.slice(index + oldBlock.length);
}

export function removeShapeBlockFromXml(xml: string, block: string): string {
  const index = xml.indexOf(block);
  if (index === -1) {
    throw new Error('shape block not found in OOXML part');
  }
  return xml.slice(0, index) + xml.slice(index + block.length);
}

/** French PowerPoint default names that must not survive after naming. */
export const LEGACY_SHAPE_NAME =
  /^(Espace réservé|Titre |Sous-titre |ZoneTexte )/;

export async function listAllSlotShapes(zip: JSZip): Promise<Map<number, ExtractedShape[]>> {
  const result = new Map<number, ExtractedShape[]>();
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(/slide(\d+)/.exec(a)?.[1] ?? '0');
      const nb = Number(/slide(\d+)/.exec(b)?.[1] ?? '0');
      return na - nb;
    });

  for (const slidePath of slidePaths) {
    const slideIndex = Number(/slide(\d+)/.exec(slidePath)?.[1] ?? '0');
    result.set(slideIndex, await collectSlideShapes(zip, slideIndex));
  }
  return result;
}

export function findShapeBySlotName(
  shapes: ExtractedShape[],
  slotName: string,
): ExtractedShape | undefined {
  return shapes.find((s) => s.name === slotName);
}

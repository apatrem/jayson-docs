#!/usr/bin/env tsx
/**
 * Mechanical OOXML rename: writes approved slot.* names into report.master.pptx.
 * Idempotent — re-running yields the same file.
 *
 *   npx tsx scripts/apply-slot-names.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LayoutSpec } from '../src/setup/types.js';
import {
  collectSlideShapes,
  extractShapesFromXml,
  getSlideLayoutPath,
  LEGACY_SHAPE_NAME,
  loadPptxZip,
  matchShape,
  removeShapeBlockFromXml,
  renameShapeBlock,
  replaceShapeBlockInXml,
  type ExtractedShape,
} from '../src/setup/pptx-shape-utils.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const specPath = join(root, 'src/setup/layout-spec.json');
const masterPath = join(root, 'templates/report.master.pptx');

interface RenameOp {
  part: string;
  oldBlock: string;
  newBlock: string;
}

interface DeleteOp {
  part: string;
  block: string;
}

const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as LayoutSpec;
const zip = await loadPptxZip(masterPath);
const renameOps: RenameOp[] = [];
const deleteOps: DeleteOp[] = [];
const queuedBlocks = new Set<string>();

function blockKey(part: string, block: string): string {
  return `${part}\0${block}`;
}

function queueRename(matched: ExtractedShape, slotName: string): void {
  if (matched.name === slotName) {
    return;
  }
  const key = blockKey(matched.sourcePart, matched.shapeBlock);
  if (queuedBlocks.has(key)) {
    return;
  }
  queuedBlocks.add(key);
  renameOps.push({
    part: matched.sourcePart,
    oldBlock: matched.shapeBlock,
    newBlock: renameShapeBlock(matched.shapeBlock, slotName),
  });
}

for (const layout of spec.layouts) {
  const slideIndex = layout.sourceSlideIndex;
  const shapes = await collectSlideShapes(zip, slideIndex);
  const used = new Set<ExtractedShape>();

  for (const slot of layout.slots) {
    const matched = matchShape(shapes, slot.slotName, slot.match, used);
    if (matched === undefined) {
      throw new Error(
        `slide ${slideIndex} (${layout.layoutId}): cannot match shape for ${slot.slotName} ` +
          `(expected current name "${slot.match.currentShapeName}")`,
      );
    }
    used.add(matched);
    queueRename(matched, slot.slotName);
  }
}

for (const deletion of spec.deletions ?? []) {
  const slideIndex = deletion.sourceSlideIndex;
  const slidePath = `ppt/slides/slide${slideIndex}.xml`;
  const slideFile = zip.file(slidePath);
  if (slideFile === null) {
    throw new Error(`slide not found for deletion: ${slidePath}`);
  }
  const shapes = await collectSlideShapes(zip, slideIndex);
  const matched = matchShape(shapes, '__delete__', deletion.match, new Set());
  if (matched === undefined) {
    continue;
  }
  const key = blockKey(matched.sourcePart, matched.shapeBlock);
  if (queuedBlocks.has(key)) {
    continue;
  }
  queuedBlocks.add(key);
  deleteOps.push({ part: matched.sourcePart, block: matched.shapeBlock });
}

for (const layout of spec.layouts) {
  const slideIndex = layout.sourceSlideIndex;
  const layoutPath = await getSlideLayoutPath(zip, slideIndex);
  const parts = [`ppt/slides/slide${slideIndex}.xml`];
  if (layoutPath !== undefined) {
    parts.push(layoutPath);
  }

  for (const part of parts) {
    const partFile = zip.file(part);
    if (partFile === null) {
      continue;
    }
    const xml = await partFile.async('string');
    const partShapes = extractShapesFromXml(xml, part);
    const used = new Set<ExtractedShape>();

    for (const shape of partShapes) {
      if (shape.name.startsWith('slot.')) {
        continue;
      }
      if (!LEGACY_SHAPE_NAME.test(shape.name)) {
        continue;
      }
      if (shape.placeholderType === undefined && shape.placeholderIdx === undefined) {
        continue;
      }

      for (const slot of layout.slots) {
        const matched = matchShape([shape], slot.slotName, slot.match, used);
        if (matched === shape) {
          used.add(shape);
          queueRename(shape, slot.slotName);
          break;
        }
      }
    }
  }
}

const mutateParts = new Set<string>([
  ...renameOps.map((o) => o.part),
  ...deleteOps.map((o) => o.part),
]);

for (const part of mutateParts) {
  const partFile = zip.file(part);
  if (partFile === null) {
    throw new Error(`OOXML part not found: ${part}`);
  }
  let xml = await partFile.async('string');
  for (const op of deleteOps.filter((o) => o.part === part)) {
    xml = removeShapeBlockFromXml(xml, op.block);
  }
  for (const op of renameOps.filter((o) => o.part === part)) {
    xml = replaceShapeBlockInXml(xml, op.oldBlock, op.newBlock);
  }
  zip.file(part, xml);
}

const output = await zip.generateAsync({
  type: 'nodebuffer',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 },
});
writeFileSync(masterPath, output);
process.stdout.write(
  `named master written: ${masterPath} (${renameOps.length} renamed, ${deleteOps.length} deleted)\n`,
);

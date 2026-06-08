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
  loadPptxZip,
  matchShape,
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

const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as LayoutSpec;
const zip = await loadPptxZip(masterPath);
const renameOps: RenameOp[] = [];
/** Blocks already queued for rename (by part + block identity) */
const queuedBlocks = new Set<string>();

function blockKey(part: string, block: string): string {
  return `${part}\0${block}`;
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

    if (matched.name === slot.slotName) {
      continue;
    }

    const key = blockKey(matched.sourcePart, matched.shapeBlock);
    if (queuedBlocks.has(key)) {
      continue;
    }
    queuedBlocks.add(key);
    renameOps.push({
      part: matched.sourcePart,
      oldBlock: matched.shapeBlock,
      newBlock: renameShapeBlock(matched.shapeBlock, slot.slotName),
    });
  }
}

const opsByPart = new Map<string, RenameOp[]>();
for (const op of renameOps) {
  const list = opsByPart.get(op.part) ?? [];
  list.push(op);
  opsByPart.set(op.part, list);
}

for (const [part, ops] of opsByPart) {
  const partFile = zip.file(part);
  if (partFile === null) {
    throw new Error(`OOXML part not found: ${part}`);
  }
  let xml = await partFile.async('string');
  for (const op of ops) {
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
process.stdout.write(`named master written: ${masterPath} (${renameOps.length} shapes renamed)\n`);

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LayoutSpec } from './types.js';
import {
  collectSlideShapes,
  extractShapesFromXml,
  findShapeBySlotName,
  getSlideLayoutPath,
  LEGACY_SHAPE_NAME,
  loadPptxZip,
  readChartKindFromShape,
  shapeMatchesSlotCriteria,
} from './pptx-shape-utils.js';

export interface MasterValidationResult {
  ok: boolean;
  errors: string[];
}

function countSlotOccurrences(
  shapes: { name: string }[],
  slotName: string,
): number {
  return shapes.filter((s) => s.name === slotName).length;
}

export async function validateMasterShapes(
  masterPath: string,
  specPath: string,
): Promise<MasterValidationResult> {
  const spec = JSON.parse(readFileSync(specPath, 'utf-8')) as LayoutSpec;
  const zip = await loadPptxZip(masterPath);
  const errors: string[] = [];

  const specSlotsBySlide = new Map<number, Set<string>>();
  for (const layout of spec.layouts) {
    const slotNames = layout.slots.map((s) => s.slotName);
    const unique = new Set(slotNames);
    if (unique.size !== slotNames.length) {
      const dupes = slotNames.filter((name, idx) => slotNames.indexOf(name) !== idx);
      errors.push(
        `layout ${layout.layoutId} (slide ${layout.sourceSlideIndex}): duplicate slot names in spec: ${[...new Set(dupes)].join(', ')}`,
      );
    }
    specSlotsBySlide.set(layout.sourceSlideIndex, unique);
  }

  for (const layout of spec.layouts) {
    const slideIndex = layout.sourceSlideIndex;
    const shapes = await collectSlideShapes(zip, slideIndex);

    for (const slot of layout.slots) {
      const count = countSlotOccurrences(shapes, slot.slotName);
      if (count === 0) {
        errors.push(
          `slide ${slideIndex} (${layout.layoutId}): missing slot shape "${slot.slotName}"`,
        );
        continue;
      }
      if (count > 1) {
        errors.push(
          `slide ${slideIndex} (${layout.layoutId}): duplicate master shapes named "${slot.slotName}" (${count} found)`,
        );
        continue;
      }

      const found = findShapeBySlotName(shapes, slot.slotName);
      if (found === undefined) {
        continue;
      }

      if (!shapeMatchesSlotCriteria(found, slot.match)) {
        errors.push(
          `slide ${slideIndex} (${layout.layoutId}): slot "${slot.slotName}" ` +
            `placeholder/geometry does not match layout-spec`,
        );
        continue;
      }

      if (slot.regionKind === 'chart' && slot.chartKind !== undefined) {
        if (!found.isChart) {
          errors.push(
            `slide ${slideIndex} (${layout.layoutId}): slot "${slot.slotName}" is not a chart shape`,
          );
          continue;
        }
        const actualKind = await readChartKindFromShape(zip, found);
        if (actualKind !== slot.chartKind) {
          errors.push(
            `slide ${slideIndex} (${layout.layoutId}): slot "${slot.slotName}" expects chart kind ` +
              `"${slot.chartKind}" but shape carries "${actualKind ?? 'none'}"`,
          );
        }
      }
    }
  }

  const slidePaths = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
  for (const slidePath of slidePaths) {
    const slideIndex = Number(/slide(\d+)/.exec(slidePath)?.[1] ?? '0');
    const shapes = await collectSlideShapes(zip, slideIndex);
    const specSlots = specSlotsBySlide.get(slideIndex);
    if (specSlots === undefined) {
      continue;
    }

    for (const shape of shapes) {
      if (!shape.name.startsWith('slot.')) {
        continue;
      }
      if (!specSlots.has(shape.name)) {
        errors.push(
          `slide ${slideIndex}: orphan slot shape "${shape.name}" not in layout-spec`,
        );
      }
    }
  }

  for (const layout of spec.layouts) {
    const slideIndex = layout.sourceSlideIndex;
    const slidePath = `ppt/slides/slide${slideIndex}.xml`;
    const slideFile = zip.file(slidePath);
    if (slideFile === null) {
      continue;
    }
    const parts = [slidePath];
    const layoutPath = await getSlideLayoutPath(zip, slideIndex);
    if (layoutPath !== undefined) {
      parts.push(layoutPath);
    }

    for (const part of parts) {
      const partFile = zip.file(part);
      if (partFile === null) {
        continue;
      }
      const shapes = extractShapesFromXml(await partFile.async('string'), part);
      for (const shape of shapes) {
        if (!LEGACY_SHAPE_NAME.test(shape.name)) {
          continue;
        }
        if (shape.placeholderType === undefined && shape.placeholderIdx === undefined) {
          continue;
        }
        errors.push(
          `slide ${slideIndex} (${layout.layoutId}): legacy placeholder name "${shape.name}" ` +
            `still present in ${part}`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function defaultPaths(): { masterPath: string; specPath: string } {
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, '..', '..');
  return {
    masterPath: join(root, 'templates/report.master.pptx'),
    specPath: join(root, 'src/setup/layout-spec.json'),
  };
}

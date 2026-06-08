import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LayoutSpec } from './types.js';
import {
  collectSlideShapes,
  findShapeBySlotName,
  loadPptxZip,
  readChartKind,
} from './pptx-shape-utils.js';

export interface MasterValidationResult {
  ok: boolean;
  errors: string[];
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
    const slots = new Set(layout.slots.map((s) => s.slotName));
    specSlotsBySlide.set(layout.sourceSlideIndex, slots);
  }

  for (const layout of spec.layouts) {
    const slideIndex = layout.sourceSlideIndex;
    const shapes = await collectSlideShapes(zip, slideIndex);

    for (const slot of layout.slots) {
      const found = findShapeBySlotName(shapes, slot.slotName);
      if (found === undefined) {
        errors.push(
          `slide ${slideIndex} (${layout.layoutId}): missing slot shape "${slot.slotName}"`,
        );
        continue;
      }

      if (slot.regionKind === 'chart' && slot.chartKind !== undefined) {
        const actualKind = await readChartKind(zip, slideIndex);
        if (actualKind !== slot.chartKind) {
          errors.push(
            `slide ${slideIndex} (${layout.layoutId}): slot.chart expects chart kind ` +
              `"${slot.chartKind}" but master has "${actualKind ?? 'none'}"`,
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

import type { Automizer } from 'pptx-automizer';
import type { Slide } from '@schema/slide.js';

/**
 * Composes one output slide:
 *   1. Copy the template slide for `slide.layoutId` from the master.
 *   2. Replace named shapes (text / image / chart-data) per slot values.
 *   3. For chart slots whose `kind` differs from the master's placeholder,
 *      hand off to `build-dynamic-chart.ts` and inject the result.
 *
 * Shape naming convention: docs/SLIDE_LAYOUT_LIBRARY.md ("Shape naming
 * convention"). Errors: ERROR_HANDLING.md ("shape-name").
 */
export function fillSlide(_automizer: Automizer, _slide: Slide): void {
  // TODO M2 / M3: implement.
  //
  // Pattern (sketch):
  //   const root = automizer.addSlide(masterName, slideIndexForLayout(slide.layoutId));
  //   for each named shape in the schema for slide.layoutId:
  //     root.modifyElement(shapeName, [ ... mutators for text/image/chart ]);
  throw new Error('M2 not implemented');
}

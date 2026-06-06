import type { Automizer } from 'pptx-automizer';
import type { Slide } from '@schema/slide.js';

/**
 * Composes one output slide:
 *   1. Copy the template slide for `slide.layoutId` from the master.
 *   2. Replace named shapes (text / image / chart-data) per slot values.
 *   3. Charts: swap the dataset into the chart pre-authored in the master
 *      (a slot's chart type is fixed by its layout — D21). The from-scratch
 *      `build-dynamic-chart.ts` route is deferred post-v1.
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

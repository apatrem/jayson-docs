import { z } from 'zod';
import { kpiRowChartLayoutSchema } from './layouts/kpi-row-chart.js';

/**
 * The closed union of all approved slide layouts.
 *
 * As you add the remaining layouts from docs/SLIDE_LAYOUT_LIBRARY.md
 * (two-column, chart-full-with-takeaway, bullets-and-image, quad,
 * section-divider), append their schemas here and import them above.
 *
 * The LLM cannot produce a slide whose layoutId is not in this union —
 * Zod will reject it. This is the load-bearing constraint that closes
 * the layout library.
 */
export const slideSchema = z.discriminatedUnion('layoutId', [
  kpiRowChartLayoutSchema,
  // TODO: add `twoColumnLayoutSchema`
  // TODO: add `chartFullWithTakeawayLayoutSchema`
  // TODO: add `bulletsAndImageLayoutSchema`
  // TODO: add `quadLayoutSchema`
  // TODO: add `sectionDividerLayoutSchema`
]);

export type Slide = z.infer<typeof slideSchema>;

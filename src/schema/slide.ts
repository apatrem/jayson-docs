import { z } from 'zod';
import { kpiRowChartLayoutSchema } from './layouts/kpi-row-chart.js';
import { realLayoutSchemas } from './layouts/real-layouts.js';

/**
 * The closed union of all approved slide layouts.
 *
 * Includes the 26 real master layouts (D22) plus `kpi-row-chart` transitionally
 * until Phase 5 retires the PLACEHOLDER walking skeleton.
 */
export const slideSchema = z.discriminatedUnion('layoutId', [
  kpiRowChartLayoutSchema,
  ...realLayoutSchemas,
]);

export type Slide = z.infer<typeof slideSchema>;

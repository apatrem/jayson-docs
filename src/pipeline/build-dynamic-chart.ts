// DEFERRED — post-v1 (DECISIONS_LOG D21). v1 does NOT build charts from scratch.
// (`import PptxGenJS from 'pptxgenjs'` would be added here if/when this lands.)
import type { ChartBlock } from '@schema/chart.js';

/**
 * DEFERRED (post-v1, D21). The from-scratch PptxGenJS chart-build route, for
 * variable chart types or kinds the master does not pre-author.
 *
 * v1 does NOT use this: charts are produced by `pptx-automizer` swapping data
 * into a chart **pre-authored in the master**, and a slot's chart type is fixed
 * by its layout (D21 corollary) — so `kind` never differs from the placeholder.
 *
 * If ever built: integration pattern in
 *   pptx-automizer/__tests__/generate-pptxgenjs-charts.test.ts;
 * per-kind contract in CHART_CATALOGUE.md. NB: PptxGenJS 4.x has **no** waterfall
 * build API — waterfall, if needed, must be pre-authored in the master.
 */
export function buildDynamicChart(_chart: ChartBlock): unknown {
  // Deferred post-v1 (D21). v1 uses pptx-automizer data-swap into pre-authored
  // master charts; building charts from scratch is not on the v1 path.
  throw new Error('dynamic chart build is post-v1 (D21)');
}

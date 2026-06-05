// NOTE: `import PptxGenJS from 'pptxgenjs'` is added back in M3 when this is
// implemented; omitted now to keep the build free of unused-import errors.
import type { ChartBlock } from '@schema/chart.js';

/**
 * Builds a from-scratch chart object using PptxGenJS for cases where the
 * chart's `kind` does not match the master's placeholder (e.g. a `waterfall`
 * when the placeholder is a `bar`). The returned object is then injected
 * into the slide via pptx-automizer.
 *
 * Canonical reference for the integration pattern:
 *   pptx-automizer/__tests__/generate-pptxgenjs-charts.test.ts
 *
 * Per-kind JSON contract: CHART_CATALOGUE.md.
 */
export function buildDynamicChart(_chart: ChartBlock): unknown {
  // TODO M3: implement.
  //
  // Pattern (sketch):
  //   const pres = new PptxGenJS();
  //   const slide = pres.addSlide();
  //   switch (chart.kind) {
  //     case 'waterfall': slide.addChart(pres.charts.WATERFALL, mapWaterfall(chart), opts); break;
  //     ...
  //   }
  //   return slide.getChart('chart-name'); // pass to pptx-automizer
  throw new Error('M3 not implemented');
}

import { modify, type Automizer } from 'pptx-automizer';
import type { Slide } from '@schema/slide.js';
import type { Dataset } from '@schema/chart.js';
import type { KpiRowChartLayout } from '@schema/layouts/kpi-row-chart.js';
import { datasetToChartData, resolveChartDataset } from './chart-data.js';
import { fillRealLayout } from './fill-real-layout.js';
import { MASTER_TEMPLATE_ALIAS } from './load-master.js';

/** Slide index in the PLACEHOLDER master for the transitional v1 layout (1-based). */
const LAYOUT_MASTER_SLIDE: Record<KpiRowChartLayout['layoutId'], number> = {
  'kpi-row-chart': 1,
};

/**
 * Composes one output slide:
 *   1. Copy the template slide for `slide.layoutId` from the master.
 *   2. Replace named shapes (text / image / chart-data) per slot values.
 *   3. Charts: swap the dataset into the chart pre-authored in the master
 *      (a slot's chart type is fixed by its layout — D21). The from-scratch
 *      `build-dynamic-chart.ts` route is deferred post-v1.
 *
 * The 26 real D22 layouts go through the layout-spec-driven engine
 * (`fill-real-layout.ts`); `kpi-row-chart` keeps its transitional v1 path
 * against the PLACEHOLDER master until Phase 5 retires it (D22).
 *
 * Shape naming convention: docs/SLIDE_LAYOUT_LIBRARY.md ("Shape naming
 * convention"). Errors: ERROR_HANDLING.md ("shape-name").
 */
export function fillSlide(
  automizer: Automizer,
  slide: Slide,
  datasets?: Record<string, Dataset>,
): void {
  if (slide.layoutId === 'kpi-row-chart') {
    fillKpiRowChart(automizer, slide, datasets);
    return;
  }
  fillRealLayout(automizer, slide, datasets);
}

function fillKpiRowChart(
  automizer: Automizer,
  slide: KpiRowChartLayout,
  datasets?: Record<string, Dataset>,
): void {
  const sourceSlide = LAYOUT_MASTER_SLIDE[slide.layoutId];

  automizer.addSlide(MASTER_TEMPLATE_ALIAS, sourceSlide, (targetSlide) => {
    targetSlide.modifyElement('slot.title', modify.setText(slide.title));

    slide['kpi-strip'].forEach((card, index) => {
      const cardNumber = index + 1;
      targetSlide.modifyElement(
        `slot.kpi-strip.card${cardNumber}.figure`,
        modify.setText(card.figure),
      );
      targetSlide.modifyElement(
        `slot.kpi-strip.card${cardNumber}.label`,
        modify.setText(card.label),
      );
      targetSlide.modifyElement(
        `slot.kpi-strip.card${cardNumber}.delta`,
        modify.setText(card.delta ?? ''),
      );
    });

    if (slide.narrative.kind === 'bullets') {
      targetSlide.modifyElement(
        'slot.narrative',
        modify.setMultiText(
          slide.narrative.items.map((item) => ({
            paragraph: { bullet: true, level: 0 },
            textRuns: [{ text: item }],
          })),
        ),
      );
    } else {
      targetSlide.modifyElement('slot.narrative', modify.setText(slide.narrative.body));
    }

    const chartDataset = resolveChartDataset(slide.chart, datasets);
    const chartData = datasetToChartData(chartDataset);
    targetSlide.modifyElement('slot.chart', [modify.setChartData(chartData)]);
  });
}

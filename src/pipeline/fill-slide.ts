import { modify, type Automizer } from 'pptx-automizer';
import type { Slide } from '@schema/slide.js';
import type { KpiRowChartLayout } from '@schema/layouts/kpi-row-chart.js';
import { MASTER_TEMPLATE_ALIAS } from './load-master.js';

/** Slide index in the master for each v1 layout (1-based). */
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
 * Shape naming convention: docs/SLIDE_LAYOUT_LIBRARY.md ("Shape naming
 * convention"). Errors: ERROR_HANDLING.md ("shape-name").
 */
export function fillSlide(automizer: Automizer, slide: Slide): void {
  // v1: slideSchema is only `kpi-row-chart`; add cases when layouts land.
  fillKpiRowChart(automizer, slide);
}

function fillKpiRowChart(automizer: Automizer, slide: KpiRowChartLayout): void {
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

    // Chart data-swap is M3 — leave slot.chart unchanged for now.
  });
}

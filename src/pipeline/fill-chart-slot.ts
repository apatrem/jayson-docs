import { modify, type ISlide } from 'pptx-automizer';
import type { ChartBlock, Dataset } from '@schema/chart.js';
import type { LayoutSlot } from '../setup/types.js';
import {
  datasetToBubbleChartData,
  datasetToChartData,
  resolveChartDataset,
} from './chart-data.js';
import { compactMultiSeriesBubblePoints, ensureChartCategoryCache } from './chart-modify.js';

function isChartBlock(value: unknown): value is ChartBlock {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    typeof (value as { kind?: unknown }).kind === 'string'
  );
}

/**
 * Chart slot handler — data-swap (D21) into the chart pre-authored in the master.
 * The slot's pinned kind is enforced by Zod; this path only replaces the dataset.
 */
export function fillChartSlot(
  targetSlide: ISlide,
  layoutId: string,
  slot: LayoutSlot,
  value: unknown,
  datasets?: Record<string, Dataset>,
): void {
  if (!isChartBlock(value)) {
    throw new Error(
      `internal invariant violation: slot "${slot.slotName}" on layout "${layoutId}" expects a chart block, but the schema-validated fill-plan supplied something else`,
    );
  }

  const chartDataset = resolveChartDataset(value, datasets);

  if (value.kind === 'bubble') {
    const chartData = datasetToBubbleChartData(chartDataset);
    const modifiers = [modify.setChartBubbles(chartData)];
    if (chartDataset.columns.some((column) => column.toLowerCase() === 'series')) {
      modifiers.push(compactMultiSeriesBubblePoints());
    }
    targetSlide.modifyElement(slot.slotName, modifiers);
    return;
  }

  const chartData = datasetToChartData(chartDataset);
  const categoryLabels = chartData.categories.map((category) => category.label);
  targetSlide.modifyElement(slot.slotName, [
    modify.setChartData(chartData),
    ensureChartCategoryCache(categoryLabels),
  ]);
}

import type { ISlide } from 'pptx-automizer';
import type { Dataset } from '@schema/chart.js';
import type { LayoutSlot } from '../setup/types.js';

/**
 * Chart slot handler — T-104 implements the data-swap (D21) into the chart
 * pre-authored in the master. Until then chart slots are explicitly rejected,
 * never silently skipped (ERROR_HANDLING.md).
 */
export function fillChartSlot(
  _targetSlide: ISlide,
  layoutId: string,
  slot: LayoutSlot,
  _value: unknown,
  _datasets?: Record<string, Dataset>,
): void {
  throw new Error(
    `chart slot "${slot.slotName}" on layout "${layoutId}" is not yet supported in T-101 — chart data-swap lands in T-104`,
  );
}

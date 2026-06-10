import type { ISlide } from 'pptx-automizer';
import type { LayoutSlot } from '../setup/types.js';

/**
 * Content-block slot handler — T-103 implements bullets / text / callout /
 * image fills. Until then content and image slots are explicitly rejected,
 * never silently skipped (ERROR_HANDLING.md).
 */
export function fillContentSlot(
  _targetSlide: ISlide,
  layoutId: string,
  slot: LayoutSlot,
  _value: unknown,
): void {
  throw new Error(
    `${slot.regionKind} slot "${slot.slotName}" on layout "${layoutId}" is not yet supported in T-101 — content blocks land in T-103`,
  );
}

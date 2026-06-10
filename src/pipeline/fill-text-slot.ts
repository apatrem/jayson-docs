import { modify, type ISlide } from 'pptx-automizer';
import type { LayoutSlot } from '../setup/types.js';

/**
 * Subtitle blocks ({ kind: 'text' | 'callout', body }) both render through the
 * same named master shape — the master styles the region, the plan supplies body.
 */
function isBodyBlock(value: unknown): value is { body: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { body?: unknown }).body === 'string'
  );
}

/**
 * The real master's slot placeholders hold empty paragraphs (no `<a:r>` run),
 * so `modify.setText` — which only rewrites an existing first run — is a
 * silent no-op there. Build the single text run instead; run/paragraph
 * properties stay empty so the placeholder inherits the master's styling.
 */
function setSlotText(targetSlide: ISlide, slotName: string, text: string): void {
  targetSlide.modifyElement(
    slotName,
    modify.setMultiText([{ paragraph: {}, textRuns: [{ text }] }]),
  );
}

/**
 * Fills one text region slot on a copied master slide.
 *
 * T-101 implements the kinds the `section` layout needs (`section-title`,
 * `subtitle`); the remaining text kinds are explicitly rejected — never
 * silently skipped (ERROR_HANDLING.md) — until T-102 lands them.
 */
export function fillTextSlot(
  targetSlide: ISlide,
  layoutId: string,
  slot: LayoutSlot,
  value: unknown,
): void {
  switch (slot.regionKind) {
    case 'section-title': {
      if (typeof value !== 'string') {
        throw new Error(
          `internal invariant violation: slot "${slot.slotName}" on layout "${layoutId}" expects a string value, but the schema-validated fill-plan supplied something else`,
        );
      }
      setSlotText(targetSlide, slot.slotName, value);
      return;
    }
    case 'subtitle': {
      if (!isBodyBlock(value)) {
        throw new Error(
          `internal invariant violation: slot "${slot.slotName}" on layout "${layoutId}" expects a subtitle block ({ kind, body }), but the schema-validated fill-plan supplied something else`,
        );
      }
      setSlotText(targetSlide, slot.slotName, value.body);
      return;
    }
    case 'title':
    case 'chart-title':
    case 'source':
      throw new Error(
        `text slot "${slot.slotName}" (${slot.regionKind}) on layout "${layoutId}" is not yet supported in T-101 — lands in T-102`,
      );
    default:
      throw new Error(`slot "${slot.slotName}" (${slot.regionKind}) is not a text slot`);
  }
}

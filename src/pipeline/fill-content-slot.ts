import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { modify, type Automizer, type ISlide } from 'pptx-automizer';
import type { LayoutSlot } from '../setup/types.js';
import { setSlotText } from './fill-text-slot.js';

function isBulletsBlock(value: unknown): value is { items: string[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'bullets' &&
    Array.isArray((value as { items?: unknown }).items)
  );
}

/**
 * Content-block slot handler. T-102 lands only what its frozen cover /
 * title-and-subtitle acceptance fixtures force through the engine — the
 * plain-string cover `body` words region and bullets; `text` / `callout` /
 * `image` content blocks are explicitly rejected, never silently skipped
 * (ERROR_HANDLING.md), until T-103 lands them.
 */
export function fillContentSlot(
  targetSlide: ISlide,
  layoutId: string,
  slot: LayoutSlot,
  value: unknown,
): void {
  if (typeof value === 'string') {
    setSlotText(targetSlide, slot.slotName, value);
    return;
  }

  if (isBulletsBlock(value)) {
    targetSlide.modifyElement(
      slot.slotName,
      modify.setMultiText(
        value.items.map((item) => ({
          paragraph: { bullet: true, level: 0 },
          textRuns: [{ text: item }],
        })),
      ),
    );
    return;
  }

  throw new Error(
    `content slot "${slot.slotName}" on layout "${layoutId}" is not yet supported for this block kind — text/callout/image content blocks land in T-103`,
  );
}

/**
 * Image slot handler. T-102 lands the relation swap its frozen cover fixture
 * forces: resolve the project-relative `ref` from the working directory, load
 * it into the output media folder, and retarget the named picture's relation
 * — the master picture frame stays authoritative for placement. Captions are
 * rejected until T-103 settles their contract (the frozen master has no
 * caption shape).
 */
export function fillImageSlot(
  automizer: Automizer,
  targetSlide: ISlide,
  layoutId: string,
  slot: LayoutSlot,
  value: unknown,
): void {
  const image = value as { ref?: unknown; caption?: unknown } | null;
  if (typeof image !== 'object' || image === null || typeof image.ref !== 'string') {
    throw new Error(
      `internal invariant violation: slot "${slot.slotName}" on layout "${layoutId}" expects an image block ({ ref }), but the schema-validated fill-plan supplied something else`,
    );
  }

  if (image.caption !== undefined) {
    throw new Error(
      `image slot "${slot.slotName}" on layout "${layoutId}" does not support a caption yet — "${slot.slotName}.caption" lands in T-103`,
    );
  }

  const imagePath = resolve(image.ref);
  if (!existsSync(imagePath)) {
    throw new Error(
      `image ref for slot "${slot.slotName}" on layout "${layoutId}" not found: ${imagePath}`,
    );
  }

  automizer.loadMedia(basename(imagePath), dirname(imagePath));
  targetSlide.modifyElement(slot.slotName, modify.setRelationTarget(basename(imagePath)));
}

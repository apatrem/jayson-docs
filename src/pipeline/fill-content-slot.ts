import { realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { modify, type Automizer, type ISlide } from 'pptx-automizer';
import type { LayoutSlot } from '../setup/types.js';
import { ImageRefError, ShapeNameError } from './errors.js';
import { setSlotText } from './fill-text-slot.js';

// pptx-automizer slugifies media filenames when writing `ppt/media/` at save time;
// reuse its own slugify so the relation Target matches the archive name exactly.
const slugifyMediaName = createRequire(createRequire(import.meta.url).resolve('pptx-automizer'))(
  'slugify',
) as (input: string) => string;

const SUPPORTED_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg']);

const IMG_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';

// pptx-automizer's `XmlElement` aliases the DOM `Element` (absent from this
// Node-only tsconfig) — type just the DOM surface used below.
interface XmlNode {
  ownerDocument: { createElement(tagName: string): XmlNode };
  getElementsByTagName(name: string): { length: number; item(index: number): XmlNode | null };
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  appendChild(child: XmlNode): unknown;
}

function isBulletsBlock(value: unknown): value is { items: string[] } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'bullets' &&
    Array.isArray((value as { items?: unknown }).items)
  );
}

function isTextOrCalloutBlock(
  value: unknown,
): value is { kind: 'text' | 'callout'; body: string } {
  const kind = (value as { kind?: unknown }).kind;
  return (
    typeof value === 'object' &&
    value !== null &&
    (kind === 'text' || kind === 'callout') &&
    typeof (value as { body?: unknown }).body === 'string'
  );
}

function isImageContentBlock(value: unknown): value is { kind: 'image'; ref: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'image' &&
    typeof (value as { ref?: unknown }).ref === 'string'
  );
}

/**
 * Content-block slot handler: plain string (cover `body`), bullets, text,
 * callout, and image blocks into `body-*` / `body` content regions. Unknown
 * block kinds are explicitly rejected — never silently skipped
 * (ERROR_HANDLING.md).
 */
export function fillContentSlot(
  automizer: Automizer,
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

  if (isTextOrCalloutBlock(value)) {
    setSlotText(targetSlide, slot.slotName, value.body);
    return;
  }

  if (isImageContentBlock(value)) {
    fillImageSlot(automizer, targetSlide, layoutId, slot, value);
    return;
  }

  throw new Error(
    `internal invariant violation: slot "${slot.slotName}" on layout "${layoutId}" expects a content block (string, bullets, text, callout, or image), but the schema-validated fill-plan supplied something else`,
  );
}

// Resolve a fill-plan image `ref` strictly inside the working directory: relative
// refs only, realpath'd against the realpath'd CWD (rejects `../` and symlink
// escapes), regular supported-image files only. Fill-plans are BYO-LLM input (D21);
// a permissive resolver is a local-file disclosure path into a shared deck.
function resolveImageRef(ref: string, slotName: string, layoutId: string): string {
  const subject = `image ref for slot "${slotName}" on layout "${layoutId}"`;
  if (isAbsolute(ref)) {
    throw new ImageRefError(
      `${subject} must be relative to the working directory — absolute paths are rejected: ${ref}`,
    );
  }

  const base = realpathSync(process.cwd());
  let real: string;
  try {
    real = realpathSync(resolve(base, ref));
  } catch {
    throw new ImageRefError(`${subject} not found: ${ref}`);
  }

  const relativeToBase = relative(base, real);
  if (relativeToBase === '' || relativeToBase.startsWith('..') || isAbsolute(relativeToBase)) {
    throw new ImageRefError(`${subject} escapes the working directory: ${ref}`);
  }
  if (!statSync(real).isFile() || !SUPPORTED_IMAGE_EXTENSIONS.has(extname(real).toLowerCase())) {
    throw new ImageRefError(
      `${subject} must be a regular image file (${[...SUPPORTED_IMAGE_EXTENSIONS].join(', ')}): ${ref}`,
    );
  }
  return real;
}

/** Append an image relationship to the slide's rels root and return its rId. */
function appendImageRelation(relsRoot: XmlNode, target: string): string {
  const relations = relsRoot.getElementsByTagName('Relationship');
  let maxId = 0;
  for (let i = 0; i < relations.length; i += 1) {
    maxId = Math.max(maxId, Number(relations.item(i)?.getAttribute('Id')?.replace(/\D/g, '')) || 0);
  }
  const relation = relsRoot.ownerDocument.createElement('Relationship');
  relation.setAttribute('Id', `rId${maxId + 1}-created`);
  relation.setAttribute('Type', IMG_REL_TYPE);
  relation.setAttribute('Target', target);
  relsRoot.appendChild(relation);
  return `rId${maxId + 1}-created`;
}

/** Add a stretched blip fill referencing `relationshipId` to the shape's spPr. */
function setShapeBlipFill(shape: XmlNode, relationshipId: string): void {
  const shapeProperties = shape.getElementsByTagName('p:spPr').item(0);
  if (shapeProperties === null) {
    return; // master contract guarantees spPr on placeholders; callbacks may not throw
  }
  const create = (tag: string) => shape.ownerDocument.createElement(tag);
  const [blipFill, blip, stretch] = [create('a:blipFill'), create('a:blip'), create('a:stretch')];
  blip.setAttribute('r:embed', relationshipId);
  stretch.appendChild(create('a:fillRect'));
  blipFill.appendChild(blip);
  blipFill.appendChild(stretch);
  shapeProperties.appendChild(blipFill);
}

// Image slot handler. The master's `slot.image` is an *empty* picture placeholder
// (no `a:blip` relation), so place the image by loading the media and, in the
// modify callback, appending a fresh image relationship plus a blip fill on the
// placeholder — the master frame stays authoritative for placement. Captions are
// rejected: the frozen master has no `<slot>.caption` shape (permanent T-103).
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
    throw new ShapeNameError(
      `master layout "${layoutId}" has no named shape "${slot.slotName}.caption" — the frozen master defines no caption shape, so image captions are unsupported`,
    );
  }

  const imagePath = resolveImageRef(image.ref, slot.slotName, layoutId);
  // T-103 seam (multi-image decks): dedupe loads + uniquify basename collisions here.
  const mediaName = slugifyMediaName(basename(imagePath));
  automizer.loadMedia(basename(imagePath), dirname(imagePath));
  targetSlide.modifyElement(slot.slotName, (element: XmlNode, relsRoot?: XmlNode) => {
    // relsRoot is always supplied for generic shapes; modify callbacks may not throw.
    if (relsRoot !== undefined)
      setShapeBlipFill(element, appendImageRelation(relsRoot, `../media/${mediaName}`));
  });
}

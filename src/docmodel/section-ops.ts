import type { DocModel } from "../schema/docmodel";
import type { Section } from "../schema/containers";
import type { Block } from "../schema/blocks";

/**
 * Pure section operations for the section sidebar (ADR-0018, item 1). Each
 * returns a NEW DocumentModel; none mutate the input. Section reordering,
 * rename, create, and delete all live here so the UI stays thin and the
 * invariants (≥1 section; each section `block+`) are enforced in one place.
 */
export type DocumentModel = Extract<DocModel, { kind: "document" }>;

/** Move the section at `fromIndex` to `toIndex` (clamped; no-op if invalid). */
export function moveSection(
  doc: DocumentModel,
  fromIndex: number,
  toIndex: number,
): DocumentModel {
  const sections = doc.sections;
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= sections.length ||
    toIndex >= sections.length
  ) {
    return doc;
  }
  const next = [...sections];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) {
    return doc;
  }
  next.splice(toIndex, 0, moved);
  return { ...doc, sections: next };
}

/**
 * Set (or clear) a section's nav title. An empty/whitespace title clears it
 * (the field is optional — sections may be untitled in the sidebar).
 */
export function renameSection(
  doc: DocumentModel,
  sectionId: string,
  title: string,
): DocumentModel {
  const trimmed = title.trim();
  const sections = doc.sections.map((section) => {
    if (section.id !== sectionId) {
      return section;
    }
    if (trimmed.length === 0) {
      const { title: _omit, ...rest } = section;
      return rest as Section;
    }
    return { ...section, title: trimmed.slice(0, 200) };
  });
  return { ...doc, sections };
}

/** An empty prose block — the default content of a freshly created section. */
function emptyProseBlock(blockId: string): Block {
  return {
    id: blockId,
    type: "prose",
    content: { type: "doc", content: [{ type: "paragraph" }] },
    align: "left",
  } as Block;
}

/**
 * Insert a new section after `afterIndex` (or at the end when undefined/out of
 * range). The section gets one empty prose block to satisfy the `block+`
 * invariant. Caller supplies stable ids (crypto.randomUUID in the app).
 */
export function createSection(
  doc: DocumentModel,
  opts: { sectionId: string; blockId: string; afterIndex?: number; title?: string },
): DocumentModel {
  const section: Section = {
    id: opts.sectionId,
    ...(opts.title && opts.title.trim().length > 0 ? { title: opts.title.trim() } : {}),
    blocks: [emptyProseBlock(opts.blockId)],
  };
  const sections = [...doc.sections];
  const at =
    opts.afterIndex === undefined || opts.afterIndex < 0 || opts.afterIndex >= sections.length
      ? sections.length
      : opts.afterIndex + 1;
  sections.splice(at, 0, section);
  return { ...doc, sections };
}

/**
 * Delete a section by id. No-op when it would remove the last section (a
 * document must keep `section+`).
 */
export function deleteSection(doc: DocumentModel, sectionId: string): DocumentModel {
  if (doc.sections.length <= 1) {
    return doc;
  }
  const sections = doc.sections.filter((section) => section.id !== sectionId);
  if (sections.length === doc.sections.length) {
    return doc; // id not found
  }
  return { ...doc, sections };
}

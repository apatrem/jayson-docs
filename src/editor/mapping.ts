import type { Block } from "../schema/blocks";
import type { Comment } from "../schema/comment";
import type { Section, Slide } from "../schema/containers";
import type { DocModel } from "../schema/docmodel";
import { loadAllBlocks } from "../blocks/runtime-registry";
import type { BlockRegistryRecord } from "../blocks/defineBlock";

// ── Registry-first dispatch (T-141b) ──────────────────────────────────────
// Lazy lookup maps built once from loadAllBlocks(). The switch arms below are
// fallback paths; they are removed block-by-block in T-142–T-156 and the
// entire fallback is deleted in T-157a.
let _schemaNameToRecord: Map<string, BlockRegistryRecord> | null = null;
let _pmNodeTypeToRecord: Map<string, BlockRegistryRecord> | null = null;

function schemaNameMap(): Map<string, BlockRegistryRecord> {
  if (!_schemaNameToRecord) {
    _schemaNameToRecord = new Map(
      loadAllBlocks().map((r) => [r.schemaName, r]),
    );
  }
  return _schemaNameToRecord;
}

function pmNodeTypeMap(): Map<string, BlockRegistryRecord> {
  if (!_pmNodeTypeToRecord) {
    _pmNodeTypeToRecord = new Map(
      loadAllBlocks().map((r) => [r.tiptapNode.name, r]),
    );
  }
  return _pmNodeTypeToRecord;
}

export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
}

export interface ProseMirrorDocument extends ProseMirrorNode {
  type: "doc";
  attrs: {
    kind: DocModel["kind"];
    schemaVersion: DocModel["schemaVersion"];
    meta: DocModel["meta"];
    comments: Comment[];
  };
  content: ProseMirrorNode[];
}

export class MappingError extends Error {
  constructor(
    message: string,
    readonly path: Array<string | number>,
  ) {
    super(`Mapping error at /${path.join("/")}: ${message}`);
    this.name = "MappingError";
  }
}

export function docModelToProseMirror(doc: DocModel): ProseMirrorDocument {
  if (doc.kind === "document") {
    return {
      type: "doc",
      attrs: rootAttrs(doc),
      content: doc.sections.map(sectionToProseMirror),
    };
  }
  return {
    type: "doc",
    attrs: rootAttrs(doc),
    content: doc.slides.map(slideToProseMirror),
  };
}

export function proseMirrorToDocModel(pm: unknown): DocModel {
  if (!isProseMirrorNode(pm) || pm.type !== "doc") {
    throw new MappingError("Root node must be type 'doc'", []);
  }
  const attrs = pm.attrs ?? {};
  const kind = attrs.kind;
  if (kind !== "document" && kind !== "deck") {
    throw new MappingError("Root attrs.kind must be 'document' or 'deck'", [
      "attrs",
      "kind",
    ]);
  }
  const schemaVersion = attrs.schemaVersion;
  if (schemaVersion !== "1.0.0") {
    throw new MappingError("Root attrs.schemaVersion must be '1.0.0'", [
      "attrs",
      "schemaVersion",
    ]);
  }

  if (kind === "document") {
    return stripUndefined({
      kind,
      schemaVersion,
      meta: attrs.meta as DocModel["meta"],
      sections: (pm.content ?? []).map((child) =>
        proseMirrorToSection(asProseMirrorNode(child)),
      ),
      comments: (attrs.comments ?? []) as Comment[],
    }) as DocModel;
  }
  return stripUndefined({
    kind,
    schemaVersion,
    meta: attrs.meta as DocModel["meta"],
    slides: (pm.content ?? []).map((child) =>
      proseMirrorToSlide(asProseMirrorNode(child)),
    ),
    comments: (attrs.comments ?? []) as Comment[],
  }) as DocModel;
}

function rootAttrs(doc: DocModel): ProseMirrorDocument["attrs"] {
  return {
    kind: doc.kind,
    schemaVersion: doc.schemaVersion,
    meta: doc.meta,
    comments: doc.comments,
  };
}

function sectionToProseMirror(section: Section): ProseMirrorNode {
  return {
    type: "section",
    attrs: {
      sectionId: section.id,
      title: section.title ?? "",
    },
    content: section.blocks.map(blockToProseMirror),
  };
}

function slideToProseMirror(slide: Slide): ProseMirrorNode {
  return {
    type: "slide",
    attrs: {
      slideId: slide.id,
      layout: slide.layout,
      notes: slide.notes ?? "",
    },
    content: slide.blocks.map(blockToProseMirror),
  };
}

function proseMirrorToSection(node: ProseMirrorNode): Section {
  if (node.type !== "section") {
    throw new MappingError(`Expected section, got ${node.type}`, ["sections"]);
  }
  const attrs = node.attrs ?? {};
  return {
    id: String(attrs.sectionId ?? ""),
    title: stringOrUndefined(attrs.title),
    blocks: (node.content ?? []).map((child) =>
      proseMirrorToBlock(asProseMirrorNode(child)),
    ),
  };
}

function proseMirrorToSlide(node: ProseMirrorNode): Slide {
  if (node.type !== "slide") {
    throw new MappingError(`Expected slide, got ${node.type}`, ["slides"]);
  }
  const attrs = node.attrs ?? {};
  return {
    id: String(attrs.slideId ?? ""),
    layout: attrs.layout as Slide["layout"],
    blocks: (node.content ?? []).map((child) =>
      proseMirrorToBlock(asProseMirrorNode(child)),
    ),
    notes: stringOrUndefined(attrs.notes),
  };
}

function blockToProseMirror(block: Block): ProseMirrorNode {
  // Registry-first: if the block type is registered, delegate to its toPm.
  // This path covers all 15 Standard blocks after T-141; switch arms below are
  // the fallback until they are deleted per-block in T-142–T-156.
  const record = schemaNameMap().get(block.type);
  if (record) {
    return record.toPm(block);
  }
  // Fallback switch (T-157a removes this entire section):
  // All 15 block types are now migrated to the registry — this default arm
  // can only be reached if an unknown block type slips through.
  return assertNever(block as never);
}

function proseMirrorToBlock(node: ProseMirrorNode): Block {
  // Registry-first: if the PM node type maps to a registered block, delegate.
  // The registry key is tiptapNode.name (the PM node type), not the schemaName.
  const record = pmNodeTypeMap().get(node.type);
  if (record) {
    return record.fromPm(node) as Block;
  }
  // Fallback (T-157a removes this entire section):
  // All 15 block types are now migrated to the registry.
  throw new MappingError(`Unknown block node type: ${node.type}`, ["blocks"]);
}

function isProseMirrorNode(value: unknown): value is ProseMirrorNode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ProseMirrorNode).type === "string"
  );
}

function asProseMirrorNode(value: unknown): ProseMirrorNode {
  if (!isProseMirrorNode(value)) {
    throw new MappingError("Expected ProseMirror node", ["content"]);
  }
  return value;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function assertNever(_block: never): never {
  throw new MappingError("Unhandled block type in mapping dispatch", ["blocks"]);
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefined(entryValue)]),
  );
}

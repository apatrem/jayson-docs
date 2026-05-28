import type { Block } from "../schema/blocks";
import type { Comment } from "../schema/comment";
import type { Section, Slide } from "../schema/containers";
import type { DocModel } from "../schema/docmodel";
import { loadAllBlocks } from "../blocks/runtime-registry";
import type { InstalledAuthoredBlock } from "../blocks/runtime-registry";
import type { BlockRegistryRecord } from "../blocks/defineBlock";
import { defineAuthoredBlock } from "../blocks/authored/defineAuthoredBlock";

// ── Registry dispatch (T-157a) ────────────────────────────────────────────
// All 15 Standard blocks live in the registry. Lookup maps are built lazily
// on first use and cached for the lifetime of the module.
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

// ── Authored block dispatch (ADR-0016) ─────────────────────────────────────
// Authored blocks aren't in loadAllBlocks(); they're resolved per-call from the
// Installed manifest set so the slug-keyed editor node reconciles with the
// `{sender}:{slug}` DocModel type. DocModel→PM looks up by fullType and strips
// to the slug; PM→DocModel looks up by slug and restores the full type.

interface AuthoredResolver {
  /** DocModel block (`type` = fullType) → PM node (`type` = slug), or null. */
  toPm(block: Block): ProseMirrorNode | null;
  /** PM node (`type` = slug) → DocModel block (`type` = fullType), or null. */
  fromPm(node: ProseMirrorNode): Block | null;
}

const EMPTY_AUTHORED_RESOLVER: AuthoredResolver = {
  toPm: () => null,
  fromPm: () => null,
};

function buildAuthoredResolver(
  installed: readonly InstalledAuthoredBlock[],
): AuthoredResolver {
  if (installed.length === 0) return EMPTY_AUTHORED_RESOLVER;
  const byFullType = new Map<string, { record: BlockRegistryRecord; fullType: string }>();
  const bySlug = new Map<string, { record: BlockRegistryRecord; fullType: string }>();
  for (const entry of installed) {
    const record = defineAuthoredBlock(entry.manifest);
    const value = { record, fullType: entry.fullType };
    byFullType.set(entry.fullType, value);
    bySlug.set(entry.manifest.slug, value);
  }
  return {
    toPm(block) {
      const entry = byFullType.get(block.type);
      // record.toPm emits a node typed by the manifest slug (ADR-0016).
      return entry ? entry.record.toPm(block) : null;
    },
    fromPm(node) {
      const entry = bySlug.get(node.type);
      if (!entry) return null;
      const block = entry.record.fromPm(node) as Record<string, unknown>;
      // record.fromPm sets `type` to the slug; restore the DocModel full type.
      // Authored blocks aren't one of the 15 union members at the type level but
      // are present at runtime (ADR-0016); cast to Block for the slug-keyed maps.
      return { ...block, type: entry.fullType } as unknown as Block;
    },
  };
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

export function docModelToProseMirror(
  doc: DocModel,
  installedAuthored: readonly InstalledAuthoredBlock[] = [],
): ProseMirrorDocument {
  const authored = buildAuthoredResolver(installedAuthored);
  if (doc.kind === "document") {
    return {
      type: "doc",
      attrs: rootAttrs(doc),
      content: doc.sections.map((s) => sectionToProseMirror(s, authored)),
    };
  }
  return {
    type: "doc",
    attrs: rootAttrs(doc),
    content: doc.slides.map((s) => slideToProseMirror(s, authored)),
  };
}

export function proseMirrorToDocModel(
  pm: unknown,
  installedAuthored: readonly InstalledAuthoredBlock[] = [],
): DocModel {
  const authored = buildAuthoredResolver(installedAuthored);
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
        proseMirrorToSection(asProseMirrorNode(child), authored),
      ),
      comments: (attrs.comments ?? []) as Comment[],
    }) as DocModel;
  }
  return stripUndefined({
    kind,
    schemaVersion,
    meta: attrs.meta as DocModel["meta"],
    slides: (pm.content ?? []).map((child) =>
      proseMirrorToSlide(asProseMirrorNode(child), authored),
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

function sectionToProseMirror(
  section: Section,
  authored: AuthoredResolver,
): ProseMirrorNode {
  return {
    type: "section",
    attrs: {
      sectionId: section.id,
      title: section.title ?? "",
    },
    content: section.blocks.map((b) => blockToProseMirror(b, authored)),
  };
}

function slideToProseMirror(
  slide: Slide,
  authored: AuthoredResolver,
): ProseMirrorNode {
  return {
    type: "slide",
    attrs: {
      slideId: slide.id,
      layout: slide.layout,
      notes: slide.notes ?? "",
    },
    content: slide.blocks.map((b) => blockToProseMirror(b, authored)),
  };
}

function proseMirrorToSection(
  node: ProseMirrorNode,
  authored: AuthoredResolver,
): Section {
  if (node.type !== "section") {
    throw new MappingError(`Expected section, got ${node.type}`, ["sections"]);
  }
  const attrs = node.attrs ?? {};
  return {
    id: String(attrs.sectionId ?? ""),
    title: stringOrUndefined(attrs.title),
    blocks: (node.content ?? []).map((child) =>
      proseMirrorToBlock(asProseMirrorNode(child), authored),
    ),
  };
}

function proseMirrorToSlide(
  node: ProseMirrorNode,
  authored: AuthoredResolver,
): Slide {
  if (node.type !== "slide") {
    throw new MappingError(`Expected slide, got ${node.type}`, ["slides"]);
  }
  const attrs = node.attrs ?? {};
  return {
    id: String(attrs.slideId ?? ""),
    layout: attrs.layout as Slide["layout"],
    blocks: (node.content ?? []).map((child) =>
      proseMirrorToBlock(asProseMirrorNode(child), authored),
    ),
    notes: stringOrUndefined(attrs.notes),
  };
}

function blockToProseMirror(
  block: Block,
  authored: AuthoredResolver,
): ProseMirrorNode {
  const record = schemaNameMap().get(block.type);
  if (record) {
    return record.toPm(block);
  }
  const authoredNode = authored.toPm(block);
  if (authoredNode) {
    return authoredNode;
  }
  // Not a Standard block and not in the Installed manifest set — e.g. an
  // authored block that was permanently deleted (the editor-side removed-block
  // placeholder is a deferred follow-up, ADR-0016).
  throw new MappingError(`Unknown block type: ${block.type}`, ["blocks"]);
}

function proseMirrorToBlock(
  node: ProseMirrorNode,
  authored: AuthoredResolver,
): Block {
  // The registry key is tiptapNode.name (the PM node type), not the schemaName.
  const record = pmNodeTypeMap().get(node.type);
  if (record) {
    return record.fromPm(node) as Block;
  }
  const authoredBlock = authored.fromPm(node);
  if (authoredBlock) {
    return authoredBlock;
  }
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

/**
 * DocModel ⇄ ProseMirror mapping orchestrator.
 *
 * This file is the TOP-LEVEL dispatch that turns a DocModel into a
 * ProseMirror document the editor can load, and parses a ProseMirror
 * document back into a DocModel for saving.
 *
 * Per-block mapping logic lives in each block's `*Node.tsx` file
 * (e.g. CalloutNode.tsx exports calloutBlockToProseMirror /
 * proseMirrorToCalloutBlock). This file just dispatches per block.type.
 *
 * Production path: src/editor/mapping.ts
 *
 * ─── Losslessness invariant ────────────────────────────────────────────
 * For every valid DocModel `doc`:
 *   proseMirrorToDocModel(docModelToProseMirror(doc)) deep-equals doc
 *
 * This is the M4 acceptance criterion (T-89). Every block type must satisfy
 * its own round-trip, AND the top-level orchestrator must preserve section/
 * slide structure, ordering, and comments.
 * ─────────────────────────────────────────────────────────────────────
 */

import type { DocModel } from "../../src/schema/docmodel";
import type { Block } from "../../src/schema/blocks";
import type { Section, Slide } from "../../src/schema/containers";
import type { Comment } from "../../src/schema/comment";

// Per-block mapping helpers — one import per block.
// (In production, these come from src/editor/nodes/*.tsx.)
import {
  calloutBlockToProseMirror,
  proseMirrorToCalloutBlock,
} from "../callout/CalloutNode";
import {
  chartBlockToProseMirror,
  proseMirrorToChartBlock,
} from "../chart/ChartNode";
// ── Add imports here for the remaining 13 blocks as they are implemented.
//    The compiler will catch missing dispatch arms via the switch's
//    exhaustiveness check below.

// ── Top-level: DocModel -> ProseMirror document ────────────────────────────

/**
 * Convert a DocModel into the ProseMirror JSON shape that TipTap loads.
 *
 * The resulting object is what you pass to TipTap's `editor.commands.setContent()`.
 */
export function docModelToProseMirror(doc: DocModel): unknown {
  if (doc.kind === "document") {
    return {
      type: "doc",
      attrs: {
        kind: "document",
        schemaVersion: doc.schemaVersion,
        meta: doc.meta,
        comments: doc.comments,
      },
      content: doc.sections.map(sectionToProseMirror),
    };
  } else {
    // kind === "deck"
    return {
      type: "doc",
      attrs: {
        kind: "deck",
        schemaVersion: doc.schemaVersion,
        meta: doc.meta,
        comments: doc.comments,
      },
      content: doc.slides.map(slideToProseMirror),
    };
  }
}

function sectionToProseMirror(section: Section): unknown {
  return {
    type: "section",
    attrs: {
      sectionId: section.id,
      title: section.title ?? "",
    },
    content: section.blocks.map(blockToProseMirror),
  };
}

function slideToProseMirror(slide: Slide): unknown {
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

// ── Per-block dispatch (THIS IS THE WHOLE TRICK) ───────────────────────────

/**
 * Dispatch one block to its per-type mapping helper.
 *
 * The switch is exhaustive over `Block['type']`. When a new block is added,
 * forgetting to add an arm here is a TypeScript compile error — the
 * `assertNever(block)` line at the end will fail to type-check.
 *
 * This is the structural enforcement that "every block has a mapping."
 */
function blockToProseMirror(block: Block): unknown {
  switch (block.type) {
    case "callout":
      return calloutBlockToProseMirror(block);
    case "chart":
      return chartBlockToProseMirror(block);
    // ── Add dispatch arms here for the remaining 13 blocks. ──────────────
    // case "prose":         return proseBlockToProseMirror(block);
    // case "heading":       return headingBlockToProseMirror(block);
    // case "bullet-list":   return bulletListBlockToProseMirror(block);
    // case "numbered-list": return numberedListBlockToProseMirror(block);
    // case "table":         return tableBlockToProseMirror(block);
    // case "kpi-cards":     return kpiCardsBlockToProseMirror(block);
    // case "timeline":      return timelineBlockToProseMirror(block);
    // case "roadmap":       return roadmapBlockToProseMirror(block);
    // case "risk-matrix":   return riskMatrixBlockToProseMirror(block);
    // case "team":          return teamBlockToProseMirror(block);
    // case "image":         return imageBlockToProseMirror(block);
    // case "diagram":       return diagramBlockToProseMirror(block);
    // case "divider":       return dividerBlockToProseMirror(block);
    default:
      return assertNever(block);
  }
}

// ── Top-level: ProseMirror document -> DocModel ────────────────────────────

interface PmNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
}

/**
 * Convert a ProseMirror JSON document back into a DocModel.
 *
 * The caller must have validated the input through `validateDocModel`
 * AFTER this function returns — this function is structural, not semantic.
 */
export function proseMirrorToDocModel(pm: unknown): DocModel {
  if (!isPmNode(pm) || pm.type !== "doc") {
    throw new MappingError("Root node must be type 'doc'", []);
  }
  const attrs = (pm.attrs ?? {}) as { kind?: string; schemaVersion?: string };
  const kind = attrs.kind;
  if (kind !== "document" && kind !== "deck") {
    throw new MappingError(
      `Root attrs.kind must be 'document' or 'deck' (got ${String(kind)})`,
      ["attrs", "kind"],
    );
  }

  const meta = (attrs as { meta?: unknown }).meta;
  const comments = (attrs as { comments?: unknown }).comments ?? [];
  const schemaVersion = attrs.schemaVersion ?? "1.0.0";

  const children = pm.content ?? [];

  if (kind === "document") {
    return {
      kind: "document",
      schemaVersion,
      meta: meta as DocModel["meta"],
      sections: children.map(proseMirrorToSection),
      comments: comments as Comment[],
    } as DocModel;
  } else {
    return {
      kind: "deck",
      schemaVersion,
      meta: meta as DocModel["meta"],
      slides: children.map(proseMirrorToSlide),
      comments: comments as Comment[],
    } as DocModel;
  }
}

function proseMirrorToSection(node: PmNode): Section {
  if (node.type !== "section") {
    throw new MappingError(`Expected section, got ${node.type}`, ["sections"]);
  }
  const attrs = (node.attrs ?? {}) as { sectionId?: string; title?: string };
  return {
    id: attrs.sectionId ?? "",
    title: attrs.title || undefined,
    blocks: (node.content ?? []).map(proseMirrorToBlock),
  };
}

function proseMirrorToSlide(node: PmNode): Slide {
  if (node.type !== "slide") {
    throw new MappingError(`Expected slide, got ${node.type}`, ["slides"]);
  }
  const attrs = (node.attrs ?? {}) as { slideId?: string; layout?: string; notes?: string };
  return {
    id: attrs.slideId ?? "",
    layout: attrs.layout as Slide["layout"],
    blocks: (node.content ?? []).map(proseMirrorToBlock),
    notes: attrs.notes || undefined,
  };
}

// ── Per-block reverse dispatch (mirrors blockToProseMirror) ────────────────

function proseMirrorToBlock(node: PmNode): Block {
  switch (node.type) {
    case "callout":
      return proseMirrorToCalloutBlock(node as never);
    case "chart":
      return proseMirrorToChartBlock(node as never);
    // ── Reverse dispatch arms for the remaining 13 blocks (mirror above) ──
    // case "prose":         return proseMirrorToProseBlock(node);
    // case "heading":       return proseMirrorToHeadingBlock(node);
    // case "bullet-list":   return proseMirrorToBulletListBlock(node);
    // case "numbered-list": return proseMirrorToNumberedListBlock(node);
    // case "table":         return proseMirrorToTableBlock(node);
    // case "kpi-cards":     return proseMirrorToKpiCardsBlock(node);
    // case "timeline":      return proseMirrorToTimelineBlock(node);
    // case "roadmap":       return proseMirrorToRoadmapBlock(node);
    // case "risk-matrix":   return proseMirrorToRiskMatrixBlock(node);
    // case "team":          return proseMirrorToTeamBlock(node);
    // case "image":         return proseMirrorToImageBlock(node);
    // case "diagram":       return proseMirrorToDiagramBlock(node);
    // case "divider":       return proseMirrorToDividerBlock(node);
    default:
      throw new MappingError(`Unknown block node type: ${node.type}`, ["blocks"]);
  }
}

// ── Error type ─────────────────────────────────────────────────────────────

export class MappingError extends Error {
  constructor(message: string, public readonly path: string[]) {
    super(`Mapping error at /${path.join("/")}: ${message}`);
    this.name = "MappingError";
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isPmNode(n: unknown): n is PmNode {
  return typeof n === "object" && n !== null && typeof (n as PmNode).type === "string";
}

/**
 * Exhaustiveness check for the block discriminator.
 *
 * When a new block.type is added to the union but not handled in the switch
 * above, TypeScript will refuse to type `_b` as `never` and the build will
 * fail. That's the compile-time enforcement we want.
 */
function assertNever(_b: never): never {
  throw new MappingError(
    `unhandled block type in mapping dispatch: ${JSON.stringify(_b)}`,
    ["blocks"],
  );
}

import type { Block } from "../schema/blocks";
import type { Comment } from "../schema/comment";
import type { Section, Slide } from "../schema/containers";
import type { DocModel } from "../schema/docmodel";
import {
  bulletListBlockToProseMirror,
  proseMirrorToBulletListBlock,
} from "./nodes/BulletListNode";
import {
  calloutBlockToProseMirror,
  proseMirrorToCalloutBlock,
} from "./nodes/CalloutNode";
import {
  chartBlockToProseMirror,
  proseMirrorToChartBlock,
} from "./nodes/ChartNode";
import {
  diagramBlockToProseMirror,
  proseMirrorToDiagramBlock,
} from "./nodes/DiagramNode";
import {
  dividerBlockToProseMirror,
  proseMirrorToDividerBlock,
} from "./nodes/DividerNode";
import {
  headingBlockToProseMirror,
  proseMirrorToHeadingBlock,
} from "./nodes/HeadingNode";
import {
  imageBlockToProseMirror,
  proseMirrorToImageBlock,
} from "./nodes/ImageNode";
import {
  kpiCardsBlockToProseMirror,
  proseMirrorToKpiCardsBlock,
} from "./nodes/KpiCardsNode";
import {
  numberedListBlockToProseMirror,
  proseMirrorToNumberedListBlock,
} from "./nodes/NumberedListNode";
import {
  proseBlockToProseMirror,
  proseMirrorToProseBlock,
} from "./nodes/ProseNode";
import {
  proseMirrorToRiskMatrixBlock,
  riskMatrixBlockToProseMirror,
} from "./nodes/RiskMatrixNode";
import {
  proseMirrorToRoadmapBlock,
  roadmapBlockToProseMirror,
} from "./nodes/RoadmapNode";
import {
  proseMirrorToTableBlock,
  tableBlockToProseMirror,
} from "./nodes/TableNode";
import {
  proseMirrorToTeamBlock,
  teamBlockToProseMirror,
} from "./nodes/TeamNode";
import {
  proseMirrorToTimelineBlock,
  timelineBlockToProseMirror,
} from "./nodes/TimelineNode";

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
    return {
      kind,
      schemaVersion,
      meta: attrs.meta as DocModel["meta"],
      sections: (pm.content ?? []).map((child) =>
        proseMirrorToSection(asProseMirrorNode(child)),
      ),
      comments: (attrs.comments ?? []) as Comment[],
    };
  }
  return {
    kind,
    schemaVersion,
    meta: attrs.meta as DocModel["meta"],
    slides: (pm.content ?? []).map((child) =>
      proseMirrorToSlide(asProseMirrorNode(child)),
    ),
    comments: (attrs.comments ?? []) as Comment[],
  };
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
  switch (block.type) {
    case "prose":
      return proseBlockToProseMirror(block);
    case "heading":
      return headingBlockToProseMirror(block);
    case "bullet-list":
      return bulletListBlockToProseMirror(block);
    case "numbered-list":
      return numberedListBlockToProseMirror(block);
    case "callout":
      return calloutBlockToProseMirror(block);
    case "kpi-cards":
      return kpiCardsBlockToProseMirror(block);
    case "image":
      return imageBlockToProseMirror(block);
    case "table":
      return tableBlockToProseMirror(block);
    case "chart":
      return chartBlockToProseMirror(block) as ProseMirrorNode;
    case "timeline":
      return timelineBlockToProseMirror(block);
    case "roadmap":
      return roadmapBlockToProseMirror(block);
    case "risk-matrix":
      return riskMatrixBlockToProseMirror(block);
    case "team":
      return teamBlockToProseMirror(block);
    case "diagram":
      return diagramBlockToProseMirror(block);
    case "divider":
      return dividerBlockToProseMirror(block);
    default:
      return assertNever(block);
  }
}

function proseMirrorToBlock(node: ProseMirrorNode): Block {
  switch (node.type) {
    case "prose":
      return proseMirrorToProseBlock(
        node as unknown as Parameters<typeof proseMirrorToProseBlock>[0],
      );
    case "heading":
      return proseMirrorToHeadingBlock(
        node as unknown as Parameters<typeof proseMirrorToHeadingBlock>[0],
      );
    case "bulletList":
      return proseMirrorToBulletListBlock(
        node as unknown as Parameters<typeof proseMirrorToBulletListBlock>[0],
      );
    case "numberedList":
      return proseMirrorToNumberedListBlock(
        node as unknown as Parameters<typeof proseMirrorToNumberedListBlock>[0],
      );
    case "callout":
      return proseMirrorToCalloutBlock(
        node as unknown as Parameters<typeof proseMirrorToCalloutBlock>[0],
      );
    case "kpiCards":
      return proseMirrorToKpiCardsBlock(
        node as unknown as Parameters<typeof proseMirrorToKpiCardsBlock>[0],
      );
    case "image":
      return proseMirrorToImageBlock(
        node as unknown as Parameters<typeof proseMirrorToImageBlock>[0],
      );
    case "docTable":
      return proseMirrorToTableBlock(
        node as unknown as Parameters<typeof proseMirrorToTableBlock>[0],
      );
    case "chart":
      return proseMirrorToChartBlock(
        node as unknown as Parameters<typeof proseMirrorToChartBlock>[0],
      );
    case "docTimeline":
      return proseMirrorToTimelineBlock(
        node as unknown as Parameters<typeof proseMirrorToTimelineBlock>[0],
      );
    case "docRoadmap":
      return proseMirrorToRoadmapBlock(
        node as unknown as Parameters<typeof proseMirrorToRoadmapBlock>[0],
      );
    case "docRiskMatrix":
      return proseMirrorToRiskMatrixBlock(
        node as unknown as Parameters<typeof proseMirrorToRiskMatrixBlock>[0],
      );
    case "docTeam":
      return proseMirrorToTeamBlock(
        node as unknown as Parameters<typeof proseMirrorToTeamBlock>[0],
      );
    case "docDiagram":
      return proseMirrorToDiagramBlock(
        node as unknown as Parameters<typeof proseMirrorToDiagramBlock>[0],
      );
    case "docDivider":
      return proseMirrorToDividerBlock(
        node as unknown as Parameters<typeof proseMirrorToDividerBlock>[0],
      );
    default:
      throw new MappingError(`Unknown block node type: ${node.type}`, ["blocks"]);
  }
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

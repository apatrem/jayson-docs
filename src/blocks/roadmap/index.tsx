/**
 * src/blocks/roadmap/index.tsx — full runtime manifest for the Roadmap block.
 *
 * T-151: migrates content from src/editor/nodes/RoadmapNode.tsx and
 * src/renderer/blocks/Roadmap.tsx into this single file.
 *
 * Named exports: RoadmapTipTapNode, roadmapBlockToProseMirror,
 *   proseMirrorToRoadmapBlock, Roadmap, RoadmapProps, and helper functions
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type {
  RoadmapBlock,
  RoadmapMilestone,
  RoadmapTimeUnit,
  RoadmapWorkstream,
} from "./schema";
import { RoadmapBlockDataSchema } from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { ZodType } from "zod";
import type { CSSProperties, FC } from "react";

// ── Brand-token / renderer dependencies ──────────────────────────────────────
import {
  resolveBrandToken,
  resolveChartPalette,
} from "../../brand-tokens/resolve";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { differenceInCalendarDays, parseISO } from "date-fns";
import type { BrandTokens } from "../../schema/brand";

// ── Registry factory ─────────────────────────────────────────────────────────
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

// ─────────────────────────────────────────────────────────────────────────────
// TipTap node
// ─────────────────────────────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentRoadmap: {
      insertRoadmap: (attrs?: Partial<RoadmapPayload>) => ReturnType;
    };
  }
}

type RoadmapPayload = {
  timeUnit: RoadmapTimeUnit;
  startDate: string;
  endDate: string;
  workstreams: RoadmapWorkstream[];
  milestones?: RoadmapMilestone[];
};

function defaultRoadmapPayload(): RoadmapPayload {
  return {
    timeUnit: "month",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    workstreams: [
      {
        label: "Workstream A",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        color: "auto",
      },
    ],
    milestones: [],
  };
}

export const RoadmapTipTapNode = Node.create({
  name: "docRoadmap",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      payload: {
        default: "{}",
        parseHTML: (el) => el.getAttribute("data-payload") ?? "{}",
        renderHTML: (attrs: { payload: string }) => ({
          "data-payload": attrs.payload,
        }),
      },
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") ?? "",
        renderHTML: (attrs: { note: string }) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block-type="roadmap"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "roadmap" }),
    ];
  },

  addCommands() {
    return {
      insertRoadmap:
        (attrs: Partial<RoadmapPayload> = {}) =>
        ({ commands }) => {
          const blockId = crypto.randomUUID();
          const base = defaultRoadmapPayload();
          const payload: RoadmapPayload = {
            timeUnit: attrs.timeUnit ?? base.timeUnit,
            startDate: attrs.startDate ?? base.startDate,
            endDate: attrs.endDate ?? base.endDate,
            workstreams: attrs.workstreams ?? base.workstreams,
          };
          if (attrs.milestones) {
            payload.milestones = attrs.milestones;
          }
          return commands.insertContent({
            type: this.name,
            attrs: {
              blockId,
              payload: JSON.stringify(payload),
              note: "",
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(RoadmapNodeView);
  },
});

const RoadmapNodeView: FC<NodeViewProps> = ({ node }) => {
  let summary = "Roadmap";
  try {
    const parsed = JSON.parse(String(node.attrs.payload)) as RoadmapPayload;
    summary = `Roadmap (${parsed.workstreams.length} workstreams)`;
  } catch {
    summary = "Roadmap (invalid payload)";
  }

  return (
    <NodeViewWrapper className="roadmap-node-view">
      <span>{summary}</span>
    </NodeViewWrapper>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type RoadmapPmNode = {
  attrs: {
    blockId: string;
    payload: string;
    note: string;
  };
};

function payloadToBlock(
  blockId: string,
  payload: RoadmapPayload,
  note: string,
): RoadmapBlock {
  const block: RoadmapBlock = {
    id: blockId,
    type: "roadmap",
    timeUnit: payload.timeUnit,
    startDate: payload.startDate,
    endDate: payload.endDate,
    workstreams: payload.workstreams,
  };
  if (payload.milestones && payload.milestones.length > 0) {
    block.milestones = payload.milestones;
  }
  if (note) {
    block.note = note;
  }
  return block;
}

export function roadmapBlockToProseMirror(block: RoadmapBlock): {
  type: string;
  attrs: RoadmapPmNode["attrs"];
} {
  const payload: RoadmapPayload = {
    timeUnit: block.timeUnit,
    startDate: block.startDate,
    endDate: block.endDate,
    workstreams: block.workstreams,
  };
  if (block.milestones) {
    payload.milestones = block.milestones;
  }
  return {
    type: "docRoadmap",
    attrs: {
      blockId: block.id,
      payload: JSON.stringify(payload),
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToRoadmapBlock(node: RoadmapPmNode): RoadmapBlock {
  const parsed = JSON.parse(node.attrs.payload) as RoadmapPayload;
  return payloadToBlock(node.attrs.blockId, parsed, node.attrs.note);
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer helpers
// ─────────────────────────────────────────────────────────────────────────────

export function roadmapRangeDays(block: RoadmapBlock): number {
  const start = parseISO(block.startDate);
  const end = parseISO(block.endDate);
  return Math.max(1, differenceInCalendarDays(end, start));
}

export function workstreamOffsetPercent(
  block: RoadmapBlock,
  date: string,
): number {
  const total = roadmapRangeDays(block);
  const offset = differenceInCalendarDays(
    parseISO(date),
    parseISO(block.startDate),
  );
  return Math.min(100, Math.max(0, (offset / total) * 100));
}

export function workstreamWidthPercent(
  block: RoadmapBlock,
  workstream: RoadmapWorkstream,
): number {
  const total = roadmapRangeDays(block);
  const span = differenceInCalendarDays(
    parseISO(workstream.endDate),
    parseISO(workstream.startDate),
  );
  return Math.max(2, (span / total) * 100);
}

export function workstreamBarColor(
  brand: BrandTokens,
  workstream: RoadmapWorkstream,
  index: number,
): string {
  switch (workstream.color) {
    case "brand.primary":
      return resolveBrandToken(brand, "colors.brand.primary");
    case "brand.secondary":
      return resolveBrandToken(brand, "colors.brand.secondary");
    case "auto":
    default:
      return (
        resolveChartPalette(brand, "qualitative")[index] ??
        resolveBrandToken(brand, "colors.brand.primary")
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface RoadmapProps {
  block: RoadmapBlock;
}

export const Roadmap: FC<RoadmapProps> = ({ block }) => {
  const brand = useBrandTokens();
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  const trackHeight = brand.spacing.unit * 6;

  const containerStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    color: textPrimary,
    marginBottom: brand.spacing.unit * 3,
  };

  const axisStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    marginBottom: brand.spacing.unit,
  };

  const rowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: brand.spacing.unit * 2,
    alignItems: "center",
    marginBottom: brand.spacing.unit * 2,
  };

  const trackStyle: CSSProperties = {
    position: "relative",
    height: trackHeight,
    backgroundColor: resolveBrandToken(
      brand,
      "colors.semantic.surfaceBackground",
    ),
    border: `1px solid ${borderColor}`,
    borderRadius: 4,
  };

  const barStyle = (
    index: number,
    ws: RoadmapWorkstream,
  ): CSSProperties => ({
    position: "absolute",
    left: `${workstreamOffsetPercent(block, ws.startDate)}%`,
    width: `${workstreamWidthPercent(block, ws)}%`,
    top: brand.spacing.unit,
    height: trackHeight - brand.spacing.unit * 2,
    backgroundColor: workstreamBarColor(brand, ws, index),
    borderRadius: 3,
  });

  const milestoneStyle = (date: string): CSSProperties => ({
    position: "absolute",
    left: `${workstreamOffsetPercent(block, date)}%`,
    top: 0,
    transform: "translateX(-50%)",
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    whiteSpace: "nowrap",
  });

  return (
    <div
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="roadmap"
      data-time-unit={block.timeUnit}
      style={containerStyle}
    >
      <div style={axisStyle}>
        <span>{block.startDate}</span>
        <span>
          {roadmapRangeDays(block)} days · {block.timeUnit}
        </span>
        <span>{block.endDate}</span>
      </div>

      {block.workstreams.map((ws, index) => (
        <div key={index} style={rowStyle}>
          <div style={{ fontWeight: 600 }}>{ws.label}</div>
          <div style={trackStyle}>
            <div
              style={barStyle(index, ws)}
              title={`${ws.startDate} → ${ws.endDate}`}
            />
          </div>
        </div>
      ))}

      {block.milestones && block.milestones.length > 0 ? (
        <div style={{ ...rowStyle, marginTop: brand.spacing.unit }}>
          <div style={{ fontWeight: 600 }}>Milestones</div>
          <div
            style={{
              ...trackStyle,
              height: trackHeight + brand.spacing.unit * 4,
            }}
          >
            {block.milestones.map((milestone, index) => (
              <div
                key={index}
                style={milestoneStyle(milestone.date)}
                title={milestone.date}
              >
                ◆ {milestone.label}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const roadmapBlock = defineBlock<RoadmapBlock>({
  schemaName: "roadmap",
  schema: RoadmapBlockDataSchema as ZodType<RoadmapBlock>,
  allowedAttrs: ["timeUnit", "startDate", "endDate", "workstreams", "milestones", "note"] as const,
  paletteLabel: "Roadmap",
  tiptapNode: RoadmapTipTapNode,
  renderer: Roadmap,
  toPm: (block) => roadmapBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToRoadmapBlock(node as unknown as RoadmapPmNode),
});

export default roadmapBlock;

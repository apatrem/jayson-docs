import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import type {
  RoadmapBlock,
  RoadmapMilestone,
  RoadmapTimeUnit,
  RoadmapWorkstream,
} from "../../schema/blocks/roadmap";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    roadmap: {
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
        (attrs = {}) =>
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

type RoadmapPmNode = {
  attrs: {
    blockId: string;
    payload: string;
    note: string;
  };
};

function payloadToBlock(blockId: string, payload: RoadmapPayload, note: string): RoadmapBlock {
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

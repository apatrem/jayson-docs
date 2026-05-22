import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import {
  defaultTimelinePhase,
  type TimelineBlock,
  type TimelineConnector,
  type TimelineOrientation,
  type TimelinePhase,
} from "../../schema/blocks/timeline";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    timeline: {
      insertTimeline: (attrs?: {
        phases?: TimelinePhase[];
        orientation?: TimelineOrientation;
        connector?: TimelineConnector;
      }) => ReturnType;
    };
  }
}

export const TimelineTipTapNode = Node.create({
  name: "docTimeline",
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
      phases: {
        default: [
          defaultTimelinePhase("Phase 1"),
          defaultTimelinePhase("Phase 2"),
        ],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-phases");
          if (!raw) {
            return [
              defaultTimelinePhase("Phase 1"),
              defaultTimelinePhase("Phase 2"),
            ];
          }
          return JSON.parse(raw) as TimelinePhase[];
        },
        renderHTML: (attrs: { phases: TimelinePhase[] }) => ({
          "data-phases": JSON.stringify(attrs.phases),
        }),
      },
      orientation: {
        default: "horizontal",
        parseHTML: (el) =>
          (el.getAttribute("data-orientation") as TimelineOrientation) ??
          "horizontal",
        renderHTML: (attrs: { orientation: TimelineOrientation }) => ({
          "data-orientation": attrs.orientation,
        }),
      },
      connector: {
        default: "arrow",
        parseHTML: (el) =>
          (el.getAttribute("data-connector") as TimelineConnector) ?? "arrow",
        renderHTML: (attrs: { connector: TimelineConnector }) => ({
          "data-connector": attrs.connector,
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
    return [{ tag: 'div[data-block-type="timeline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "timeline" }),
    ];
  },

  addCommands() {
    return {
      insertTimeline:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              phases: attrs.phases ?? [
                defaultTimelinePhase("Phase 1"),
                defaultTimelinePhase("Phase 2"),
              ],
              orientation: attrs.orientation ?? "horizontal",
              connector: attrs.connector ?? "arrow",
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TimelineNodeView);
  },
});

const TimelineNodeView: FC<NodeViewProps> = ({ node }) => {
  const phases = node.attrs.phases as TimelinePhase[];
  const orientation = node.attrs.orientation as TimelineOrientation;

  return (
    <NodeViewWrapper className="timeline-node-view">
      <span>
        Timeline ({phases.length} phases, {orientation})
      </span>
    </NodeViewWrapper>
  );
};

type TimelinePmNode = {
  attrs: {
    blockId: string;
    phases: TimelinePhase[];
    orientation: TimelineOrientation;
    connector: TimelineConnector;
    note: string;
  };
};

export function timelineBlockToProseMirror(block: TimelineBlock): {
  type: string;
  attrs: TimelinePmNode["attrs"];
} {
  return {
    type: "docTimeline",
    attrs: {
      blockId: block.id,
      phases: block.phases,
      orientation: block.orientation,
      connector: block.connector,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToTimelineBlock(node: TimelinePmNode): TimelineBlock {
  return {
    id: node.attrs.blockId,
    type: "timeline",
    phases: node.attrs.phases,
    orientation: node.attrs.orientation,
    connector: node.attrs.connector,
    note: node.attrs.note || undefined,
  };
}

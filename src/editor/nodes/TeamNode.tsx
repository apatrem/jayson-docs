import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import {
  type TeamBlock,
  type TeamLayout,
  type TeamMember,
} from "../../schema/blocks/team";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    team: {
      insertTeam: (attrs?: {
        layout?: TeamLayout;
        members?: TeamMember[];
      }) => ReturnType;
    };
  }
}

function defaultMembers(): TeamMember[] {
  return [
    {
      name: "Jane Smith",
      role: "Engagement lead",
      allocation: "50%",
    },
  ];
}

export const TeamTipTapNode = Node.create({
  name: "docTeam",
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
      layout: {
        default: "grid",
        parseHTML: (el) =>
          (el.getAttribute("data-layout") as TeamLayout) ?? "grid",
        renderHTML: (attrs: { layout: TeamLayout }) => ({
          "data-layout": attrs.layout,
        }),
      },
      members: {
        default: defaultMembers(),
        parseHTML: (el) => {
          const raw = el.getAttribute("data-members");
          if (!raw) return defaultMembers();
          return JSON.parse(raw) as TeamMember[];
        },
        renderHTML: (attrs: { members: TeamMember[] }) => ({
          "data-members": JSON.stringify(attrs.members),
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
    return [{ tag: 'div[data-block-type="team"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "team" }),
    ];
  },

  addCommands() {
    return {
      insertTeam:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              layout: attrs.layout ?? "grid",
              members: attrs.members ?? defaultMembers(),
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TeamNodeView);
  },
});

const TeamNodeView: FC<NodeViewProps> = ({ node }) => {
  const members = node.attrs.members as TeamMember[];
  const layout = node.attrs.layout as TeamLayout;
  return (
    <NodeViewWrapper className="team-node-view">
      <span>
        Team ({layout}, {members.length} members)
      </span>
    </NodeViewWrapper>
  );
};

type TeamPmNode = {
  attrs: {
    blockId: string;
    layout: TeamLayout;
    members: TeamMember[];
    note: string;
  };
};

export function teamBlockToProseMirror(block: TeamBlock): {
  type: string;
  attrs: TeamPmNode["attrs"];
} {
  return {
    type: "docTeam",
    attrs: {
      blockId: block.id,
      layout: block.layout,
      members: block.members,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToTeamBlock(node: TeamPmNode): TeamBlock {
  return {
    id: node.attrs.blockId,
    type: "team",
    layout: node.attrs.layout,
    members: node.attrs.members,
    note: node.attrs.note || undefined,
  };
}

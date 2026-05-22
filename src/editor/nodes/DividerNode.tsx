import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import type { DividerBlock } from "../../schema/blocks/divider";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    divider: {
      insertDivider: (attrs?: {
        label?: string;
        subtitle?: string;
        numbering?: string;
      }) => ReturnType;
    };
  }
}

export const DividerTipTapNode = Node.create({
  name: "docDivider",
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
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label") ?? "",
        renderHTML: (attrs: { label: string }) => ({ "data-label": attrs.label }),
      },
      subtitle: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-subtitle") ?? "",
        renderHTML: (attrs: { subtitle: string }) => ({
          "data-subtitle": attrs.subtitle,
        }),
      },
      numbering: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-numbering") ?? "",
        renderHTML: (attrs: { numbering: string }) => ({
          "data-numbering": attrs.numbering,
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
    return [{ tag: 'hr[data-block-type="divider"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "hr",
      mergeAttributes(HTMLAttributes, { "data-block-type": "divider" }),
    ];
  },

  addCommands() {
    return {
      insertDivider:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              label: attrs.label ?? "",
              subtitle: attrs.subtitle ?? "",
              numbering: attrs.numbering ?? "",
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DividerNodeView);
  },
});

const DividerNodeView: FC<NodeViewProps> = ({ node }) => {
  const label = node.attrs.label as string;
  return (
    <NodeViewWrapper className="divider-node-view">
      <span>Divider{label ? `: ${label}` : ""}</span>
    </NodeViewWrapper>
  );
};

type DividerPmNode = {
  attrs: {
    blockId: string;
    label: string;
    subtitle: string;
    numbering: string;
    note: string;
  };
};

export function dividerBlockToProseMirror(block: DividerBlock): {
  type: string;
  attrs: DividerPmNode["attrs"];
} {
  return {
    type: "docDivider",
    attrs: {
      blockId: block.id,
      label: block.label ?? "",
      subtitle: block.subtitle ?? "",
      numbering: block.numbering ?? "",
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToDividerBlock(node: DividerPmNode): DividerBlock {
  return {
    id: node.attrs.blockId,
    type: "divider",
    label: node.attrs.label || undefined,
    subtitle: node.attrs.subtitle || undefined,
    numbering: node.attrs.numbering || undefined,
    note: node.attrs.note || undefined,
  };
}

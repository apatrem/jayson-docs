import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import {
  emptyNumberedListItem,
  type NumberedListBlock,
  type NumberedListItem,
} from "../../schema/blocks/numbered-list";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    numberedList: {
      insertNumberedList: (attrs?: {
        items?: NumberedListItem[];
      }) => ReturnType;
    };
  }
}

export const NumberedListTipTapNode = Node.create({
  name: "numberedList",
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
      items: {
        default: [emptyNumberedListItem()],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-items");
          if (!raw) {
            return [emptyNumberedListItem()];
          }
          return JSON.parse(raw) as NumberedListItem[];
        },
        renderHTML: (attrs: { items: NumberedListItem[] }) => ({
          "data-items": JSON.stringify(attrs.items),
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
    return [{ tag: 'ol[data-block-type="numbered-list"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ol",
      mergeAttributes(HTMLAttributes, { "data-block-type": "numbered-list" }),
    ];
  },

  addCommands() {
    return {
      insertNumberedList:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              items: attrs.items ?? [emptyNumberedListItem()],
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(NumberedListNodeView);
  },
});

const NumberedListNodeView: FC<NodeViewProps> = ({ node }) => {
  const items = node.attrs.items as NumberedListItem[];
  const count = items.length;

  return (
    <NodeViewWrapper className="numbered-list-node-view">
      <span>
        Numbered list ({count} item{count === 1 ? "" : "s"})
      </span>
    </NodeViewWrapper>
  );
};

type NumberedListPmNode = {
  attrs: {
    blockId: string;
    items: NumberedListItem[];
    note: string;
  };
};

export function numberedListBlockToProseMirror(block: NumberedListBlock): {
  type: string;
  attrs: NumberedListPmNode["attrs"];
} {
  return {
    type: "numberedList",
    attrs: {
      blockId: block.id,
      items: block.items,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToNumberedListBlock(
  node: NumberedListPmNode,
): NumberedListBlock {
  return {
    id: node.attrs.blockId,
    type: "numbered-list",
    items: node.attrs.items,
    note: node.attrs.note || undefined,
  };
}

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import {
  emptyBulletListItem,
  type BulletListBlock,
  type BulletListItem,
} from "../../schema/blocks/bullet-list";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentBulletList: {
      insertBulletList: (attrs?: { items?: BulletListItem[] }) => ReturnType;
    };
  }
}

export const BulletListTipTapNode = Node.create({
  name: "bulletList",
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
        default: [emptyBulletListItem()],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-items");
          if (!raw) {
            return [emptyBulletListItem()];
          }
          return JSON.parse(raw) as BulletListItem[];
        },
        renderHTML: (attrs: { items: BulletListItem[] }) => ({
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
    return [{ tag: 'ul[data-block-type="bullet-list"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(HTMLAttributes, { "data-block-type": "bullet-list" }),
    ];
  },

  addCommands() {
    return {
      insertBulletList:
        (attrs: { items?: BulletListItem[] } = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              items: attrs.items ?? [emptyBulletListItem()],
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(BulletListNodeView);
  },
});

const BulletListNodeView: FC<NodeViewProps> = ({ node }) => {
  const items = node.attrs.items as BulletListItem[];
  const topLevel = items.length;
  const nested = items.reduce(
    (sum, item) => sum + (item.children?.length ?? 0),
    0,
  );

  return (
    <NodeViewWrapper className="bullet-list-node-view">
      <span>
        Bullet list ({topLevel} item{topLevel === 1 ? "" : "s"}
        {nested > 0 ? `, ${nested} nested` : ""})
      </span>
    </NodeViewWrapper>
  );
};

type BulletListPmNode = {
  attrs: {
    blockId: string;
    items: BulletListItem[];
    note: string;
  };
};

export function bulletListBlockToProseMirror(block: BulletListBlock): {
  type: string;
  attrs: BulletListPmNode["attrs"];
} {
  return {
    type: "bulletList",
    attrs: {
      blockId: block.id,
      items: block.items,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToBulletListBlock(
  node: BulletListPmNode,
): BulletListBlock {
  return {
    id: node.attrs.blockId,
    type: "bullet-list",
    items: node.attrs.items,
    note: node.attrs.note || undefined,
  };
}

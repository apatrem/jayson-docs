import { Node, mergeAttributes } from "@tiptap/core";
import type { ProseMirrorFragment } from "../../schema/prosemirror-fragment";
import type { ProseAlign, ProseBlock } from "../../schema/blocks/prose";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    prose: {
      insertProse: (attrs?: { align?: ProseAlign }) => ReturnType;
    };
  }
}

export const ProseTipTapNode = Node.create({
  name: "prose",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      align: {
        default: "left",
        parseHTML: (el) => el.getAttribute("data-align") ?? "left",
        renderHTML: (attrs: { align: ProseAlign }) => ({
          "data-align": attrs.align,
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
    return [{ tag: 'div[data-block-type="prose"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "prose" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertProse:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              align: attrs.align ?? "left",
              note: "",
            },
            content: [{ type: "paragraph", content: [] }],
          }),
    };
  },
});

type ProseMirrorNode = {
  attrs: { blockId: string; align: ProseAlign; note: string };
  content: ProseMirrorFragment["content"];
};

export function proseBlockToProseMirror(block: ProseBlock): {
  type: string;
  attrs: ProseMirrorNode["attrs"];
  content: ProseMirrorNode["content"];
} {
  return {
    type: "prose",
    attrs: {
      blockId: block.id,
      align: block.align,
      note: block.note ?? "",
    },
    content: block.content.content,
  };
}

export function proseMirrorToProseBlock(node: ProseMirrorNode): ProseBlock {
  return {
    id: node.attrs.blockId,
    type: "prose",
    align: node.attrs.align,
    content: { type: "doc", content: node.content },
    note: node.attrs.note || undefined,
  };
}

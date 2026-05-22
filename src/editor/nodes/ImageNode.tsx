import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import type { ImageAlign, ImageBlock, ImageWidth } from "../../schema/blocks/image";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      insertImage: (attrs?: {
        src?: string;
        alt?: string;
        caption?: string;
        width?: ImageWidth;
        align?: ImageAlign;
      }) => ReturnType;
    };
  }
}

export const ImageTipTapNode = Node.create({
  name: "image",
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
      src: {
        default: "assets/placeholder.jpg",
        parseHTML: (el) =>
          el.querySelector("img")?.getAttribute("src") ??
          el.getAttribute("data-src") ??
          "assets/placeholder.jpg",
        renderHTML: (attrs: { src: string }) => ({ "data-src": attrs.src }),
      },
      alt: {
        default: "",
        parseHTML: (el) =>
          el.querySelector("img")?.getAttribute("alt") ??
          el.getAttribute("data-alt") ??
          "",
        renderHTML: (attrs: { alt: string }) => ({ "data-alt": attrs.alt }),
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") ?? "",
        renderHTML: (attrs: { caption: string }) => ({
          "data-caption": attrs.caption,
        }),
      },
      width: {
        default: "medium",
        parseHTML: (el) => el.getAttribute("data-width") ?? "medium",
        renderHTML: (attrs: { width: ImageWidth }) => ({
          "data-width": attrs.width,
        }),
      },
      align: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") ?? "center",
        renderHTML: (attrs: { align: ImageAlign }) => ({
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
    return [{ tag: 'figure[data-block-type="image"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-block-type": "image" }),
    ];
  },

  addCommands() {
    return {
      insertImage:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              src: attrs.src ?? "assets/placeholder.jpg",
              alt: attrs.alt ?? "Image",
              caption: attrs.caption ?? "",
              width: attrs.width ?? "medium",
              align: attrs.align ?? "center",
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

const ImageNodeView: FC<NodeViewProps> = ({ node }) => {
  const alt = node.attrs.alt as string;
  const src = node.attrs.src as string;

  return (
    <NodeViewWrapper className="image-node-view">
      <span>
        Image: {alt || "(no alt)"} — {src}
      </span>
    </NodeViewWrapper>
  );
};

type ImagePmNode = {
  attrs: {
    blockId: string;
    src: string;
    alt: string;
    caption: string;
    width: ImageWidth;
    align: ImageAlign;
    note: string;
  };
};

export function imageBlockToProseMirror(block: ImageBlock): {
  type: string;
  attrs: ImagePmNode["attrs"];
} {
  return {
    type: "image",
    attrs: {
      blockId: block.id,
      src: block.src,
      alt: block.alt,
      caption: block.caption ?? "",
      width: block.width,
      align: block.align,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToImageBlock(node: ImagePmNode): ImageBlock {
  return {
    id: node.attrs.blockId,
    type: "image",
    src: node.attrs.src,
    alt: node.attrs.alt,
    caption: node.attrs.caption || undefined,
    width: node.attrs.width,
    align: node.attrs.align,
    note: node.attrs.note || undefined,
  };
}

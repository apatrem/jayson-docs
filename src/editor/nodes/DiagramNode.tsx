import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import {
  type DiagramBlock,
  type DiagramWidth,
} from "../../schema/blocks/diagram";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    diagram: {
      insertDiagram: (attrs?: {
        source?: string;
        title?: string;
        caption?: string;
        width?: DiagramWidth;
      }) => ReturnType;
    };
  }
}

const defaultSource = `graph TD
  A[Start] --> B[End]`;

export const DiagramTipTapNode = Node.create({
  name: "docDiagram",
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
      source: {
        default: defaultSource,
        parseHTML: (el) =>
          el.getAttribute("data-mermaid-source") ??
          el.querySelector("pre")?.textContent ??
          defaultSource,
        renderHTML: (attrs: { source: string }) => ({
          "data-mermaid-source": attrs.source,
        }),
      },
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") ?? "",
        renderHTML: (attrs: { title: string }) => ({ "data-title": attrs.title }),
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") ?? "",
        renderHTML: (attrs: { caption: string }) => ({
          "data-caption": attrs.caption,
        }),
      },
      width: {
        default: "large",
        parseHTML: (el) =>
          (el.getAttribute("data-width") as DiagramWidth) ?? "large",
        renderHTML: (attrs: { width: DiagramWidth }) => ({
          "data-width": attrs.width,
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
    return [{ tag: 'div[data-block-type="diagram"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "diagram" }),
    ];
  },

  addCommands() {
    return {
      insertDiagram:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              source: attrs.source ?? defaultSource,
              title: attrs.title ?? "",
              caption: attrs.caption ?? "",
              width: attrs.width ?? "large",
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramNodeView);
  },
});

const DiagramNodeView: FC<NodeViewProps> = ({ node }) => {
  const source = node.attrs.source as string;
  const lineCount = source.split("\n").length;
  return (
    <NodeViewWrapper className="diagram-node-view">
      <span>Diagram (Mermaid, {lineCount} lines)</span>
    </NodeViewWrapper>
  );
};

type DiagramPmNode = {
  attrs: {
    blockId: string;
    source: string;
    title: string;
    caption: string;
    width: DiagramWidth;
    note: string;
  };
};

export function diagramBlockToProseMirror(block: DiagramBlock): {
  type: string;
  attrs: DiagramPmNode["attrs"];
} {
  return {
    type: "docDiagram",
    attrs: {
      blockId: block.id,
      source: block.source,
      title: block.title ?? "",
      caption: block.caption ?? "",
      width: block.width,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToDiagramBlock(node: DiagramPmNode): DiagramBlock {
  return {
    id: node.attrs.blockId,
    type: "diagram",
    source: node.attrs.source,
    title: node.attrs.title || undefined,
    caption: node.attrs.caption || undefined,
    width: node.attrs.width,
    note: node.attrs.note || undefined,
  };
}

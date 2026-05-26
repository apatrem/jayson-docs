import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { CSSProperties, FC, MouseEvent } from "react";
import { Diagram } from "../../renderer/blocks/Diagram";
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

const stopEditorCapture = (event: MouseEvent): void => {
  event.stopPropagation();
};

const DiagramNodeView: FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const blockId = node.attrs.blockId as string;
  const source = node.attrs.source as string;
  const title = node.attrs.title as string;
  const caption = node.attrs.caption as string;
  const width = node.attrs.width as DiagramWidth;
  const block: DiagramBlock = {
    id: blockId,
    type: "diagram",
    source,
    width,
    ...(title ? { title } : {}),
    ...(caption ? { caption } : {}),
  };

  return (
    <NodeViewWrapper
      className="diagram-node-view"
      data-block-id={blockId}
      contentEditable={false}
      style={{
        outline: selected ? "2px solid var(--brand-primary, #0B3D91)" : "none",
        outlineOffset: 4,
      }}
    >
      <div
        style={editorFormStyle}
        onMouseDown={stopEditorCapture}
        aria-label="Edit diagram"
      >
        <label style={fieldLabelStyle}>
          Title
          <input
            type="text"
            value={title}
            maxLength={120}
            placeholder="Optional title"
            onChange={(event) => {
              updateAttributes({ title: event.target.value });
            }}
          />
        </label>
        <label style={fieldLabelStyle}>
          Caption
          <input
            type="text"
            value={caption}
            maxLength={500}
            placeholder="Optional caption"
            onChange={(event) => {
              updateAttributes({ caption: event.target.value });
            }}
          />
        </label>
        <label style={fieldLabelStyle}>
          Width
          <select
            value={width}
            onChange={(event) => {
              updateAttributes({ width: event.target.value as DiagramWidth });
            }}
          >
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="full">Full</option>
          </select>
        </label>
        <label style={fieldLabelStyle}>
          Mermaid source
          <textarea
            value={source}
            rows={8}
            maxLength={4000}
            spellCheck={false}
            style={sourceTextareaStyle}
            onChange={(event) => {
              updateAttributes({ source: event.target.value });
            }}
          />
        </label>
      </div>
      <Diagram block={block} />
    </NodeViewWrapper>
  );
};

const editorFormStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem",
  marginBottom: "0.75rem",
  padding: "0.75rem",
  border: "1px solid ButtonBorder",
  borderRadius: "0.375rem",
};

const fieldLabelStyle: CSSProperties = {
  display: "grid",
  fontSize: "0.8125rem",
  gap: "0.25rem",
};

const sourceTextareaStyle: CSSProperties = {
  fontFamily: "monospace",
  fontSize: "0.8125rem",
  lineHeight: 1.4,
  resize: "vertical",
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

/**
 * src/blocks/diagram/index.tsx — full runtime manifest for the Diagram block.
 *
 * T-149: migrates content from src/editor/nodes/DiagramNode.tsx and
 * src/renderer/blocks/Diagram.tsx into this single file.
 *
 * Named exports: DiagramTipTapNode, diagramBlockToProseMirror,
 *   proseMirrorToDiagramBlock, Diagram, DiagramProps
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 *
 * Note: The Diagram renderer takes an optional renderedSvg prop used on PDF
 * export paths. DocumentRenderer supplies it directly via case "diagram".
 * T-157b will add renderWithContext() to handle this properly.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type { DiagramBlock, DiagramWidth } from "./schema";
import { DiagramBlockSchema, diagramMaxWidthPercent } from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { ZodType } from "zod";
import type { ComponentType, CSSProperties, FC, MouseEvent } from "react";

// ── Brand-token / renderer dependencies ──────────────────────────────────────
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";

// ── Registry factory ─────────────────────────────────────────────────────────
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

// ─────────────────────────────────────────────────────────────────────────────
// TipTap node
// ─────────────────────────────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentDiagram: {
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
        (
          attrs: {
            source?: string;
            title?: string;
            caption?: string;
            width?: DiagramWidth;
          } = {},
        ) =>
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

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface DiagramProps {
  block: DiagramBlock;
  /** Pre-rendered SVG for PDF/export paths; omitted in SSR shell mode. */
  renderedSvg?: string;
}

export const Diagram: FC<DiagramProps> = ({ block, renderedSvg }) => {
  const brand = useBrandTokens();
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");
  const surface = resolveBrandToken(brand, "colors.semantic.surfaceBackground");

  const figureStyle: CSSProperties = {
    margin: 0,
    marginBottom: brand.spacing.unit * 3,
    maxWidth: diagramMaxWidthPercent(block.width),
    width: "100%",
    fontFamily: brand.typography.fonts.body.family,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    marginBottom: brand.spacing.unit,
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.h4,
    fontWeight: 600,
    color: textPrimary,
  };

  const shellStyle: CSSProperties = {
    border: `1px solid ${borderColor}`,
    borderRadius: brand.spacing.unit / 2,
    backgroundColor: surface,
    padding: brand.spacing.unit * 2,
    overflow: "auto",
  };

  const captionStyle: CSSProperties = {
    marginTop: brand.spacing.unit,
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    fontStyle: "italic",
  };

  const sourceStyle: CSSProperties = {
    margin: 0,
    fontFamily: brand.typography.fonts.mono.family,
    fontSize: brand.typography.scale.caption,
    lineHeight: brand.typography.lineHeight.normal,
    color: textSecondary,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };

  return (
    <figure
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="diagram"
      data-width={block.width}
      data-mermaid-source={block.source}
      style={figureStyle}
    >
      {block.title ? <h4 style={titleStyle}>{block.title}</h4> : null}
      <div style={shellStyle}>
        {renderedSvg ? (
          <img
            data-diagram-rendered="svg"
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderedSvg)}`}
            alt={block.title ?? "Diagram"}
            style={{ display: "block", maxWidth: "100%", height: "auto" }}
          />
        ) : (
          <pre style={sourceStyle} aria-label="Mermaid diagram source">
            {block.source}
          </pre>
        )}
      </div>
      {block.caption ? (
        <figcaption style={captionStyle}>{block.caption}</figcaption>
      ) : null}
    </figure>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const diagramBlock = defineBlock<DiagramBlock>({
  schemaName: "diagram",
  schema: DiagramBlockSchema as ZodType<DiagramBlock>,
  allowedAttrs: ["source", "title", "caption", "width", "note"] as const,
  paletteLabel: "Diagram",
  tiptapNode: DiagramTipTapNode,
  // Diagram renderer takes an optional renderedSvg prop for PDF export.
  // DocumentRenderer supplies it directly via case "diagram". T-157b handles
  // this properly via renderWithContext().
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: Diagram as ComponentType<{ block: any }>,
  toPm: (block) => diagramBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToDiagramBlock(node as unknown as DiagramPmNode),
});

export default diagramBlock;

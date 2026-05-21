/**
 * Reference block #7 — Callout TipTap node view.
 *
 * This is the editor-surface implementation. It maps the CalloutBlock <-> the
 * editor's internal ProseMirror document so consultants can edit callouts
 * visually.
 *
 * Pattern notes for copy-adapt:
 *  - Every structured block (one with `attrs`) is a TipTap atom node with a
 *    React node view. Prose blocks use TipTap's native rich-text instead.
 *  - The `attrs` payload mirrors the schema fields except for prose-typed
 *    children (body, etc.) which live in `content` as actual ProseMirror nodes.
 *  - parseHTML / renderHTML are needed for copy/paste and the DocModel<->editor
 *    mapping to be lossless (per BUILD_BRIEF M4 acceptance).
 *  - The node view renders the editing UI (here: a thin wrapper showing the
 *    variant + title input + body editable area + variant dropdown).
 *  - DO NOT render production styling here. The TipTap node view shows the
 *    EDIT experience. The production rendering is in <Callout> (Callout.tsx).
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import React from "react";
import type { CalloutVariant } from "./schema";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Insert a new callout block with default variant 'info'. */
      insertCallout: (attrs?: { variant?: CalloutVariant; title?: string }) => ReturnType;
      /** Change the variant of the currently-selected callout. */
      setCalloutVariant: (variant: CalloutVariant) => ReturnType;
    };
  }
}

export const CalloutTipTapNode = Node.create({
  name: "callout",
  group: "block",
  // Callout body is rich text — TipTap manages it as inline+block content.
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      blockId: {
        // Stable id matching CalloutBlock.id (required for comment anchoring).
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs) => ({ "data-block-id": attrs.blockId }),
      },
      variant: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-variant") || "info",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") || "",
        renderHTML: (attrs) => ({ "data-title": attrs.title }),
      },
      attribution: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-attribution") || "",
        renderHTML: (attrs) => ({ "data-attribution": attrs.attribution }),
      },
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") || "",
        renderHTML: (attrs) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-block-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, { "data-block-type": "callout" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertCallout:
        (attrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              variant: attrs.variant ?? "info",
              title: attrs.title ?? "",
              attribution: "",
              note: "",
            },
            content: [{ type: "paragraph", content: [] }],
          });
        },
      setCalloutVariant:
        (variant) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { variant }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutNodeView);
  },
});

/**
 * The React component shown inside the editor for a callout.
 *
 * Keep this minimal — it is the EDITING surface, not production styling.
 * The variant dropdown lives in a small toolbar that appears when the
 * callout is selected; the title is a single-line input; the body is a
 * <NodeViewContent /> region that TipTap manages as editable rich text.
 */
const CalloutNodeView: React.FC<{
  node: { attrs: { blockId: string; variant: CalloutVariant; title: string; attribution: string } };
  updateAttributes: (attrs: Record<string, unknown>) => void;
  selected: boolean;
}> = ({ node, updateAttributes, selected }) => {
  const { variant, title, attribution } = node.attrs;

  // Variant labels for the dropdown. The actual visual treatment (color)
  // happens in <Callout>, not here.
  const variantLabels: Record<CalloutVariant, string> = {
    info: "Info",
    success: "Success",
    warning: "Warning",
    error: "Error",
    quote: "Quote",
    tip: "Tip",
  };

  return (
    <NodeViewWrapper
      className={`callout-editor variant-${variant} ${selected ? "selected" : ""}`}
      data-block-id={node.attrs.blockId}
    >
      {selected && (
        <div className="callout-toolbar" contentEditable={false}>
          <label>
            Variant:{" "}
            <select
              value={variant}
              onChange={(e) => updateAttributes({ variant: e.target.value as CalloutVariant })}
            >
              {(Object.keys(variantLabels) as CalloutVariant[]).map((v) => (
                <option key={v} value={v}>
                  {variantLabels[v]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <input
        className="callout-title"
        type="text"
        value={title}
        placeholder="Title (optional)"
        onChange={(e) => updateAttributes({ title: e.target.value })}
        // contentEditable lives in the title input itself, not in the wrapping NodeViewWrapper
      />

      <div className="callout-body">
        {/*
          NodeViewContent is TipTap's "child of this node lives here" marker.
          The block-level content (paragraphs, inline marks) is managed by
          ProseMirror inside this region.
        */}
        <NodeViewContent />
      </div>

      {variant === "quote" && (
        <input
          className="callout-attribution"
          type="text"
          value={attribution}
          placeholder="Attribution (optional)"
          onChange={(e) => updateAttributes({ attribution: e.target.value })}
        />
      )}
    </NodeViewWrapper>
  );
};

/**
 * Mapping helper: convert a CalloutBlock (from DocModel) into the
 * ProseMirror JSON shape that TipTap loads.
 *
 * This is the per-block half of the DocModel <-> editor mapping (BUILD_BRIEF
 * M4 acceptance: lossless round-trip).
 */
export function calloutBlockToProseMirror(block: import("./schema").CalloutBlock): unknown {
  return {
    type: "callout",
    attrs: {
      blockId: block.id,
      variant: block.variant,
      title: block.title ?? "",
      attribution: block.attribution ?? "",
      note: block.note ?? "",
    },
    content: block.body.content,        // pass through the ProseMirror fragment content
  };
}

/**
 * Mapping helper: convert a TipTap node back into a CalloutBlock.
 *
 * NOTE: this throws if the node is not a callout. The caller (mapping.ts)
 * dispatches per node type before calling this.
 */
export function proseMirrorToCalloutBlock(node: {
  attrs: { blockId: string; variant: CalloutVariant; title: string; attribution: string; note: string };
  content: unknown[];
}): import("./schema").CalloutBlock {
  return {
    id: node.attrs.blockId,
    type: "callout",
    variant: node.attrs.variant,
    title: node.attrs.title || undefined,
    body: { type: "doc", content: node.content as never },
    attribution: node.attrs.attribution || undefined,
    note: node.attrs.note || undefined,
  };
}

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import type { ProseMirrorFragment } from "../../schema/prosemirror-fragment";
import type { CalloutBlock, CalloutVariant } from "../../schema/blocks/callout";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (attrs?: {
        variant?: CalloutVariant;
        title?: string;
      }) => ReturnType;
      setCalloutVariant: (variant: CalloutVariant) => ReturnType;
    };
  }
}

export const CalloutTipTapNode = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      variant: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-variant") || "info",
        renderHTML: (attrs: { variant: CalloutVariant }) => ({
          "data-variant": attrs.variant,
        }),
      },
      title: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-title") || "",
        renderHTML: (attrs: { title: string }) => ({ "data-title": attrs.title }),
      },
      attribution: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-attribution") || "",
        renderHTML: (attrs: { attribution: string }) => ({
          "data-attribution": attrs.attribution,
        }),
      },
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") || "",
        renderHTML: (attrs: { note: string }) => ({ "data-note": attrs.note }),
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
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              variant: attrs.variant ?? "info",
              title: attrs.title ?? "",
              attribution: "",
              note: "",
            },
            content: [{ type: "paragraph", content: [] }],
          }),
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

const variantLabels: Record<CalloutVariant, string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  error: "Error",
  quote: "Quote",
  tip: "Tip",
};

const CalloutNodeView: FC<NodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const variant = node.attrs.variant as CalloutVariant;
  const title = node.attrs.title as string;
  const attribution = node.attrs.attribution as string;

  return (
    <NodeViewWrapper
      className={`callout-editor variant-${variant} ${selected ? "selected" : ""}`}
      data-block-id={node.attrs.blockId as string}
    >
      {selected ? (
        <div className="callout-toolbar" contentEditable={false}>
          <label>
            Variant:{" "}
            <select
              value={variant}
              onChange={(e) =>
                updateAttributes({ variant: e.target.value as CalloutVariant })
              }
            >
              {(Object.keys(variantLabels) as CalloutVariant[]).map((v) => (
                <option key={v} value={v}>
                  {variantLabels[v]}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <input
        className="callout-title"
        type="text"
        value={title}
        placeholder="Title (optional)"
        onChange={(e) => updateAttributes({ title: e.target.value })}
      />

      <div className="callout-body">
        <NodeViewContent />
      </div>

      {variant === "quote" ? (
        <input
          className="callout-attribution"
          type="text"
          value={attribution}
          placeholder="Attribution (optional)"
          onChange={(e) => updateAttributes({ attribution: e.target.value })}
        />
      ) : null}
    </NodeViewWrapper>
  );
};

type CalloutPmNode = {
  attrs: {
    blockId: string;
    variant: CalloutVariant;
    title: string;
    attribution: string;
    note: string;
  };
  content: ProseMirrorFragment["content"];
};

export function calloutBlockToProseMirror(block: CalloutBlock): {
  type: string;
  attrs: CalloutPmNode["attrs"];
  content: CalloutPmNode["content"];
} {
  return {
    type: "callout",
    attrs: {
      blockId: block.id,
      variant: block.variant,
      title: block.title ?? "",
      attribution: block.attribution ?? "",
      note: block.note ?? "",
    },
    content: block.body.content,
  };
}

export function proseMirrorToCalloutBlock(node: CalloutPmNode): CalloutBlock {
  return {
    id: node.attrs.blockId,
    type: "callout",
    variant: node.attrs.variant,
    title: node.attrs.title || undefined,
    body: { type: "doc", content: node.content },
    attribution: node.attrs.attribution || undefined,
    note: node.attrs.note || undefined,
  };
}

/**
 * src/blocks/callout/index.tsx — full runtime manifest for the Callout block.
 *
 * T-145: migrates content from src/editor/nodes/CalloutNode.tsx and
 * src/renderer/blocks/Callout.tsx into this single file. The legacy files at
 * those paths have been deleted; update any imports to use this module instead.
 *
 * Named exports (backward-compat aliases for consumers):
 *   CalloutTipTapNode, calloutBlockToProseMirror, proseMirrorToCalloutBlock,
 *   Callout, CalloutProps
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type { CalloutBlock, CalloutVariant } from "./schema";
import {
  CalloutBlockSchema,
  CalloutVariantSchema,
  calloutTintTokenFor,
} from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { ZodType } from "zod";
import type { CSSProperties, FC } from "react";
import type { ProseMirrorFragment } from "../../schema/prosemirror-fragment";

// ── Brand-token / renderer dependencies ──────────────────────────────────────
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../../renderer/ProseRenderer";

// ── Registry factory ─────────────────────────────────────────────────────────
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

// ─────────────────────────────────────────────────────────────────────────────
// TipTap node
// ─────────────────────────────────────────────────────────────────────────────

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

// Fully inline-edited callout: title + attribution are controlled inputs bound
// to attrs (contentEditable=false so the editor doesn't hijack them), the body
// is inline rich text via NodeViewContent, and the variant is a small inline
// select. Styled to match the print Renderer so the editor view ≈ the output.
const stop = (event: { stopPropagation: () => void }): void => event.stopPropagation();

const CalloutNodeView: FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const brand = useBrandTokens();
  const variant = node.attrs.variant as CalloutVariant;
  const title = node.attrs.title as string;
  const attribution = node.attrs.attribution as string;

  const tintColor = resolveBrandToken(brand, calloutTintTokenFor(variant));
  const surfaceBg = resolveBrandToken(brand, "colors.semantic.surfaceBackground");
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");

  const containerStyle: CSSProperties = {
    backgroundColor: surfaceBg,
    borderLeft: `4px solid ${tintColor}`,
    borderRadius: 4,
    padding: `${brand.spacing.unit * 3}px ${brand.spacing.unit * 4}px`,
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: textPrimary,
    outline: selected ? "2px solid var(--brand-primary, #0B3D91)" : "none",
    outlineOffset: 4,
    position: "relative",
  };

  const titleInputStyle: CSSProperties = {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: 0,
    margin: `0 0 ${brand.spacing.unit * 2}px 0`,
    fontFamily: brand.typography.fonts.heading.family,
    fontWeight: 600,
    color: tintColor,
  };

  const attributionInputStyle: CSSProperties = {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: 0,
    marginTop: brand.spacing.unit * 2,
    fontSize: brand.typography.scale.caption,
    fontStyle: "italic",
    color: resolveBrandToken(brand, "colors.semantic.textSecondary"),
  };

  return (
    <NodeViewWrapper
      as="aside"
      className={`callout-editor variant-${variant}`}
      data-block-id={node.attrs.blockId as string}
      data-variant={variant}
      style={containerStyle}
    >
      <div contentEditable={false} style={styles.variantRow}>
        <select
          aria-label="Callout variant"
          value={variant}
          onChange={(event) => updateAttributes({ variant: event.target.value })}
          onMouseDown={stop}
          onKeyDown={stop}
          style={styles.variantSelect}
        >
          {CalloutVariantSchema.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div contentEditable={false}>
        <input
          type="text"
          aria-label="Callout title"
          value={title}
          placeholder="Title (optional)"
          onChange={(event) => updateAttributes({ title: event.target.value })}
          onMouseDown={stop}
          onKeyDown={stop}
          style={titleInputStyle}
        />
      </div>

      <NodeViewContent />

      {variant === "quote" ? (
        <div contentEditable={false}>
          <input
            type="text"
            aria-label="Quote attribution"
            value={attribution}
            placeholder="— Attribution"
            onChange={(event) =>
              updateAttributes({ attribution: event.target.value })
            }
            onMouseDown={stop}
            onKeyDown={stop}
            style={attributionInputStyle}
          />
        </div>
      ) : null}
    </NodeViewWrapper>
  );
};

const styles: Record<string, CSSProperties> = {
  variantRow: {
    position: "absolute",
    top: 4,
    right: 8,
  },
  variantSelect: {
    fontSize: "0.6875rem",
    color: "#64748B",
    background: "#FFFFFF",
    border: "1px solid #D6DEE8",
    borderRadius: "0.375rem",
    padding: "0.1rem 0.3rem",
    textTransform: "capitalize",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface CalloutProps {
  block: CalloutBlock;
}

export const Callout: FC<CalloutProps> = ({ block }) => {
  const brand = useBrandTokens();

  const tintColor = resolveBrandToken(brand, calloutTintTokenFor(block.variant));
  const surfaceBg = resolveBrandToken(brand, "colors.semantic.surfaceBackground");
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");

  const containerStyle: CSSProperties = {
    backgroundColor: surfaceBg,
    borderLeft: `4px solid ${tintColor}`,
    borderRadius: 4,
    padding: `${brand.spacing.unit * 3}px ${brand.spacing.unit * 4}px`,
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: textPrimary,
  };

  const titleStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.bodyLg,
    fontWeight: 600,
    color: tintColor,
    marginBottom: brand.spacing.unit * 2,
  };

  const attributionStyle: CSSProperties = {
    marginTop: brand.spacing.unit * 2,
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    fontStyle: "italic",
  };

  return (
    <aside
      className="doc-keep-together"
      role="note"
      aria-label={block.variant}
      data-block-id={block.id}
      data-block-type="callout"
      data-variant={block.variant}
      style={containerStyle}
    >
      {block.title ? <div style={titleStyle}>{block.title}</div> : null}
      <ProseRenderer fragment={block.body} />
      {block.variant === "quote" && block.attribution ? (
        <div style={attributionStyle}>— {block.attribution}</div>
      ) : null}
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const calloutBlock = defineBlock<CalloutBlock>({
  schemaName: "callout",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: CalloutBlockSchema as ZodType<CalloutBlock>,
  allowedAttrs: ["variant", "title", "body", "attribution", "note"] as const,
  paletteLabel: "Callout",
  tiptapNode: CalloutTipTapNode,
  renderer: Callout,
  toPm: (block) => calloutBlockToProseMirror(block) as unknown as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToCalloutBlock(node as unknown as CalloutPmNode),
});

export default calloutBlock;

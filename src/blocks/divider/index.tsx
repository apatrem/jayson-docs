/**
 * src/blocks/divider/index.ts — full runtime manifest for the Divider block.
 *
 * T-142: migrates content from src/editor/nodes/DividerNode.tsx and
 * src/renderer/blocks/Divider.tsx into this single file. The legacy files at
 * those paths have been deleted; update any imports to use this module instead.
 *
 * Named exports (backward-compat aliases for consumers):
 *   DividerTipTapNode, dividerBlockToProseMirror, proseMirrorToDividerBlock,
 *   Divider, DividerProps, DividerRenderContext
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type { DividerBlock } from "./schema";
import { DividerBlockSchema } from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { ZodType } from "zod";
import type { FC, CSSProperties } from "react";

// ── Brand-token / renderer dependencies ──────────────────────────────────────
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { lookupBrandPath, resolveBrandToken } from "../../brand-tokens/resolve";

// ── Registry factory ─────────────────────────────────────────────────────────
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

// ─────────────────────────────────────────────────────────────────────────────
// TipTap node
// ─────────────────────────────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    divider: {
      insertDivider: (attrs?: {
        label?: string;
        subtitle?: string;
        numbering?: string;
      }) => ReturnType;
    };
  }
}

export const DividerTipTapNode = Node.create({
  name: "docDivider",
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
      label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label") ?? "",
        renderHTML: (attrs: { label: string }) => ({ "data-label": attrs.label }),
      },
      subtitle: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-subtitle") ?? "",
        renderHTML: (attrs: { subtitle: string }) => ({
          "data-subtitle": attrs.subtitle,
        }),
      },
      numbering: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-numbering") ?? "",
        renderHTML: (attrs: { numbering: string }) => ({
          "data-numbering": attrs.numbering,
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
    return [{ tag: 'hr[data-block-type="divider"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "hr",
      mergeAttributes(HTMLAttributes, { "data-block-type": "divider" }),
    ];
  },

  addCommands() {
    return {
      insertDivider:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              label: attrs.label ?? "",
              subtitle: attrs.subtitle ?? "",
              numbering: attrs.numbering ?? "",
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DividerNodeView);
  },
});

const DividerNodeView: FC<NodeViewProps> = ({ node, selected }) => {
  const blockId = String(node.attrs.blockId);
  const label = node.attrs.label as string | undefined;
  const subtitle = node.attrs.subtitle as string | undefined;
  const numbering = node.attrs.numbering as string | undefined;
  const block: DividerBlock = {
    id: blockId,
    type: "divider",
    ...(label ? { label } : {}),
    ...(subtitle ? { subtitle } : {}),
    ...(numbering ? { numbering } : {}),
  };

  return (
    <NodeViewWrapper
      className="divider-node-view"
      data-block-id={blockId}
      contentEditable={false}
      style={editorBlockStyle(selected)}
    >
      <Divider block={block} />
    </NodeViewWrapper>
  );
};

function editorBlockStyle(selected: boolean): CSSProperties {
  return {
    outline: selected ? "2px solid var(--brand-primary, #0B3D91)" : "none",
    outlineOffset: 4,
    cursor: "pointer",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type DividerPmNode = {
  attrs: {
    blockId: string;
    label: string;
    subtitle: string;
    numbering: string;
    note: string;
  };
};

export function dividerBlockToProseMirror(block: DividerBlock): {
  type: string;
  attrs: DividerPmNode["attrs"];
} {
  return {
    type: "docDivider",
    attrs: {
      blockId: block.id,
      label: block.label ?? "",
      subtitle: block.subtitle ?? "",
      numbering: block.numbering ?? "",
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToDividerBlock(node: DividerPmNode): DividerBlock {
  return {
    id: node.attrs.blockId,
    type: "divider",
    label: node.attrs.label || undefined,
    subtitle: node.attrs.subtitle || undefined,
    numbering: node.attrs.numbering || undefined,
    note: node.attrs.note || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export type DividerRenderContext = "document" | "deck";

export interface DividerProps {
  block: DividerBlock;
  context?: DividerRenderContext;
}

function deckTitleSize(brand: ReturnType<typeof useBrandTokens>): number {
  const deckTitle = lookupBrandPath(brand, "typography.scale.deckTitle");
  if (typeof deckTitle === "number") {
    return deckTitle;
  }
  return brand.typography.scale.h1 ?? brand.typography.scale.h2 ?? 32;
}

export const Divider: FC<DividerProps> = ({ block, context = "document" }) => {
  const brand = useBrandTokens();

  if (context === "deck") {
    const background = resolveBrandToken(brand, "colors.brand.dark");
    const textColor = resolveBrandToken(brand, "colors.neutral.0");
    const subtitleColor = resolveBrandToken(brand, "colors.brand.light");

    const slideStyle: CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: brand.deck.dimensionsPx.height,
      padding: brand.deck.margins.top,
      backgroundColor: background,
      color: textColor,
      fontFamily: brand.typography.fonts.heading.family,
      textAlign: "center",
      marginBottom: brand.spacing.unit * 3,
    };

    const numberingStyle: CSSProperties = {
      margin: 0,
      marginBottom: brand.spacing.unit * 2,
      fontSize: brand.typography.scale.bodyLg ?? brand.typography.scale.h4,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: subtitleColor,
    };

    const labelStyle: CSSProperties = {
      margin: 0,
      fontSize: deckTitleSize(brand),
      fontWeight: 600,
      lineHeight: brand.typography.lineHeight.tight,
    };

    const subtitleStyle: CSSProperties = {
      margin: 0,
      marginTop: brand.spacing.unit * 2,
      fontSize: brand.typography.scale.h3,
      fontWeight: 400,
      color: subtitleColor,
      fontFamily: brand.typography.fonts.body.family,
    };

    return (
      <section
        data-block-id={block.id}
        data-block-type="divider"
        data-render-context="deck"
        style={slideStyle}
        role="doc-pagebreak"
      >
        {block.numbering ? <p style={numberingStyle}>{block.numbering}</p> : null}
        {block.label ? <h2 style={labelStyle}>{block.label}</h2> : null}
        {block.subtitle ? <p style={subtitleStyle}>{block.subtitle}</p> : null}
      </section>
    );
  }

  const breakStyle: CSSProperties = {
    breakBefore: "page",
    pageBreakBefore: "always",
    height: 0,
    margin: 0,
    border: "none",
    padding: 0,
  };

  return (
    <hr
      className="doc-page-break"
      data-block-id={block.id}
      data-block-type="divider"
      data-render-context="document"
      style={breakStyle}
      aria-hidden="true"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const dividerBlock = defineBlock<DividerBlock>({
  schemaName: "divider",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: DividerBlockSchema as ZodType<DividerBlock>,
  allowedAttrs: ["label", "subtitle", "numbering", "note"] as const,
  paletteLabel: "Divider",
  tiptapNode: DividerTipTapNode,
  renderer: Divider,
  toPm: (block) => dividerBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToDividerBlock(node as unknown as DividerPmNode),
});

export default dividerBlock;

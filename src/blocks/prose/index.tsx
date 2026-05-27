/**
 * src/blocks/prose/index.tsx — full runtime manifest for the Prose block.
 *
 * T-144: migrates content from src/editor/nodes/ProseNode.tsx and
 * src/renderer/blocks/Prose.tsx into this single file. The legacy files at
 * those paths have been deleted; update any imports to use this module instead.
 *
 * Named exports (backward-compat aliases for consumers):
 *   ProseTipTapNode, proseBlockToProseMirror, proseMirrorToProseBlock,
 *   Prose, ProseProps
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type { ProseBlock, ProseAlign } from "./schema";
import { ProseBlockSchema } from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import type { ZodType } from "zod";
import type { CSSProperties, FC } from "react";

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
        parseHTML: (el: HTMLElement): string | null =>
          el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      align: {
        default: "left",
        parseHTML: (el: HTMLElement): string =>
          el.getAttribute("data-align") ?? "left",
        renderHTML: (attrs: { align: ProseAlign }) => ({
          "data-align": attrs.align,
        }),
      },
      note: {
        default: "",
        parseHTML: (el: HTMLElement): string =>
          el.getAttribute("data-note") ?? "",
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

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type ProsePmNode = {
  attrs: { blockId: string; align: ProseAlign; note: string };
  // ProseMirror content nodes — structure validated by TipTap's own schema,
  // not by us. We treat the array opaquely here and let the round-trip
  // through `block.content.content` carry the real shape.
  content: unknown[];
};

export function proseBlockToProseMirror(block: ProseBlock): {
  type: string;
  attrs: ProsePmNode["attrs"];
  content: ProsePmNode["content"];
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

export function proseMirrorToProseBlock(node: ProsePmNode): ProseBlock {
  return {
    id: node.attrs.blockId,
    type: "prose",
    align: node.attrs.align,
    content: { type: "doc", content: node.content },
    note: node.attrs.note || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface ProseProps {
  block: ProseBlock;
}

export const Prose: FC<ProseProps> = ({ block }) => {
  const brand = useBrandTokens();

  const style: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    textAlign: block.align,
    margin: 0,
    marginBottom: brand.spacing.unit * 1.5,
  };

  return (
    <div
      data-block-id={block.id}
      data-block-type="prose"
      data-align={block.align}
      style={style}
    >
      <ProseRenderer fragment={block.content} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const proseBlock = defineBlock<ProseBlock>({
  schemaName: "prose",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: ProseBlockSchema as ZodType<ProseBlock>,
  allowedAttrs: ["content", "align", "note"] as const,
  paletteLabel: "Prose",
  tiptapNode: ProseTipTapNode,
  renderer: Prose,
  toPm: (block) => proseBlockToProseMirror(block) as unknown as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) => proseMirrorToProseBlock(node as unknown as ProsePmNode),
});

export default proseBlock;

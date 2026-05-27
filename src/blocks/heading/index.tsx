/**
 * src/blocks/heading/index.tsx — full runtime manifest for the Heading block.
 *
 * T-143: migrates content from src/editor/nodes/HeadingNode.tsx and
 * src/renderer/blocks/Heading.tsx into this single file. The legacy files at
 * those paths have been deleted; update any imports to use this module instead.
 *
 * Named exports (backward-compat aliases for consumers):
 *   HeadingTipTapNode, headingBlockToProseMirror, proseMirrorToHeadingBlock,
 *   Heading, HeadingProps
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type { HeadingBlock, HeadingLevel } from "./schema";
import { HeadingBlockSchema, headingScaleKey } from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { ZodType } from "zod";
import { createElement, type CSSProperties, type FC } from "react";

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
    documentHeading: {
      insertHeading: (attrs?: {
        level?: HeadingLevel;
        text?: string;
        numbered?: boolean;
      }) => ReturnType;
    };
  }
}

export const HeadingTipTapNode = Node.create({
  name: "heading",
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
      level: {
        default: 2,
        parseHTML: (el) => Number(el.getAttribute("data-level") ?? 2),
        renderHTML: (attrs: { level: HeadingLevel }) => ({
          "data-level": attrs.level,
        }),
      },
      text: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-text") ?? "",
        renderHTML: (attrs: { text: string }) => ({ "data-text": attrs.text }),
      },
      numbered: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-numbered") !== "false",
        renderHTML: (attrs: { numbered: boolean }) => ({
          "data-numbered": attrs.numbered ? "true" : "false",
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
    return [{ tag: 'div[data-block-type="heading"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "heading" }),
    ];
  },

  addCommands() {
    return {
      insertHeading:
        (
          attrs: {
            level?: HeadingLevel;
            text?: string;
            numbered?: boolean;
          } = {},
        ) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              level: attrs.level ?? 2,
              text: attrs.text ?? "New heading",
              numbered: attrs.numbered ?? true,
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(HeadingNodeView);
  },
});

const HeadingNodeView: FC<NodeViewProps> = ({ node, updateAttributes }) => {
  const level = node.attrs.level as HeadingLevel;
  const text = node.attrs.text as string;
  const numbered = node.attrs.numbered as boolean;

  return (
    <NodeViewWrapper className="heading-node-view">
      <label>
        Level
        <select
          value={level}
          onChange={(e) =>
            updateAttributes({ level: Number(e.target.value) as HeadingLevel })
          }
        >
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
          <option value={4}>H4</option>
        </select>
      </label>
      <input
        type="text"
        value={text}
        maxLength={200}
        onChange={(e) => updateAttributes({ text: e.target.value })}
      />
      <label>
        <input
          type="checkbox"
          checked={numbered}
          onChange={(e) => updateAttributes({ numbered: e.target.checked })}
        />
        Numbered
      </label>
    </NodeViewWrapper>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type HeadingPmNode = {
  attrs: {
    blockId: string;
    level: HeadingLevel;
    text: string;
    numbered: boolean;
    note: string;
  };
};

export function headingBlockToProseMirror(block: HeadingBlock): {
  type: string;
  attrs: HeadingPmNode["attrs"];
} {
  return {
    type: "heading",
    attrs: {
      blockId: block.id,
      level: block.level,
      text: block.text,
      numbered: block.numbered,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToHeadingBlock(node: HeadingPmNode): HeadingBlock {
  return {
    id: node.attrs.blockId,
    type: "heading",
    level: node.attrs.level,
    text: node.attrs.text,
    numbered: node.attrs.numbered,
    note: node.attrs.note || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface HeadingProps {
  block: HeadingBlock;
}

const TAG_BY_LEVEL: Record<HeadingLevel, "h1" | "h2" | "h3" | "h4"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
};

export const Heading: FC<HeadingProps> = ({ block }) => {
  const brand = useBrandTokens();
  const scaleKey = headingScaleKey(block.level);

  const style: CSSProperties = {
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale[scaleKey],
    lineHeight: brand.typography.lineHeight.tight,
    color: resolveBrandToken(brand, "colors.semantic.headingPrimary"),
    margin: 0,
    marginBottom: brand.spacing.unit * 2,
    fontWeight: 600,
  };

  return createElement(
    TAG_BY_LEVEL[block.level],
    {
      "data-block-id": block.id,
      "data-block-type": "heading",
      "data-level": block.level,
      "data-numbered": block.numbered ? "true" : "false",
      style,
    },
    block.text,
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const headingBlock = defineBlock<HeadingBlock>({
  schemaName: "heading",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: HeadingBlockSchema as ZodType<HeadingBlock>,
  allowedAttrs: ["level", "text", "numbered", "note"] as const,
  paletteLabel: "Heading",
  tiptapNode: HeadingTipTapNode,
  renderer: Heading,
  toPm: (block) => headingBlockToProseMirror(block) as ProseMirrorNode,
  // Cast via unknown: ProseMirrorNode.attrs is Record<string,unknown>;
  // the specific PmNode type narrows that to the node's actual attrs.
  fromPm: (node) =>
    proseMirrorToHeadingBlock(node as unknown as HeadingPmNode),
});

export default headingBlock;

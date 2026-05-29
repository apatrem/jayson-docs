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
import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import {
  NodeViewContent,
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
import { useHeadingNumber } from "./number-context";
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
  content: "text*",
  marks: "",
  defining: true,

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
      0,
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
        ({ commands }) => {
          const text = attrs.text ?? "New heading";
          return commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              level: attrs.level ?? 2,
              numbered: attrs.numbered ?? true,
              note: "",
            },
            content: text.length > 0 ? [{ type: "text", text }] : [],
          });
        },
    };
  },

  // Markdown-style level control: typing "# " … "#### " at the start of a
  // heading sets its level. Keeps level editing inline (no side panel).
  addInputRules() {
    return ([1, 2, 3, 4] as const).map(
      (level) =>
        new InputRule({
          find: new RegExp(`^#{${level}}\\s$`),
          handler: ({ state, range, chain }) => {
            const { $from } = state.selection;
            if ($from.parent.type.name !== this.name) return;
            chain()
              .deleteRange(range)
              .updateAttributes(this.name, { level })
              .run();
          },
        }),
    );
  },

  addNodeView() {
    return ReactNodeViewRenderer(HeadingNodeView);
  },
});

// Inline-editable heading: NodeViewContent renders the heading text directly,
// styled to match the print Renderer so the editor view ≈ the rendered output.
const HeadingNodeView: FC<NodeViewProps> = ({ node, decorations }) => {
  const brand = useBrandTokens();
  const level = node.attrs.level as HeadingLevel;
  const scaleKey = headingScaleKey(level);
  const Tag = TAG_BY_LEVEL[level];

  // The HeadingNumber plugin attaches the computed number to a node decoration
  // (recomputed live per transaction). "" → unnumbered → no marker.
  const number = readHeadingNumberDecoration(decorations);

  const style: CSSProperties = {
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale[scaleKey],
    lineHeight: brand.typography.lineHeight.tight,
    color: resolveBrandToken(brand, "colors.semantic.headingPrimary"),
    // Inter-block spacing is centralized in editor.css (--doc-block-gap); the
    // heading sets no marginBottom of its own to avoid double gaps.
    margin: 0,
    fontWeight: 600,
    flex: number ? "1 1 auto" : undefined,
    minWidth: number ? 0 : undefined,
  };

  return (
    <NodeViewWrapper
      className="heading-node-view"
      data-block-id={String(node.attrs.blockId)}
      data-block-type="heading"
      data-level={level}
      style={number ? { display: "flex", alignItems: "baseline", gap: "0.5em" } : undefined}
    >
      {number ? (
        <span className="doc-heading-number" contentEditable={false} style={{ flex: "0 0 auto" }}>
          {number}
        </span>
      ) : null}
      <NodeViewContent as={Tag} style={style} />
    </NodeViewWrapper>
  );
};

/** Pull the heading number out of the node decorations supplied by the plugin. */
function readHeadingNumberDecoration(
  decorations: NodeViewProps["decorations"],
): string {
  for (const decoration of decorations) {
    const spec = decoration.spec as { headingNumber?: unknown } | undefined;
    if (spec && typeof spec.headingNumber === "string") {
      return spec.headingNumber;
    }
  }
  return "";
}

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type HeadingPmNode = {
  attrs: {
    blockId: string;
    level: HeadingLevel;
    numbered: boolean;
    note: string;
  };
  content?: Array<{ type?: string; text?: string }>;
};

export function headingBlockToProseMirror(block: HeadingBlock): {
  type: string;
  attrs: HeadingPmNode["attrs"];
  content: NonNullable<HeadingPmNode["content"]>;
} {
  return {
    type: "heading",
    attrs: {
      blockId: block.id,
      level: block.level,
      numbered: block.numbered,
      note: block.note ?? "",
    },
    // Plain-text inline content (no marks). Empty text → empty content, since
    // ProseMirror text nodes cannot be empty.
    content: block.text.length > 0 ? [{ type: "text", text: block.text }] : [],
  };
}

export function proseMirrorToHeadingBlock(node: HeadingPmNode): HeadingBlock {
  const text = (node.content ?? [])
    .map((child) => (typeof child.text === "string" ? child.text : ""))
    .join("");
  return {
    id: node.attrs.blockId,
    type: "heading",
    level: node.attrs.level,
    text,
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
  // Computed outline number (ADR-0018) — null when this heading is unnumbered
  // or rendered outside a document (no provider). The number is a projection.
  const number = useHeadingNumber(block.id);

  const style: CSSProperties = {
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale[scaleKey],
    lineHeight: brand.typography.lineHeight.tight,
    color: resolveBrandToken(brand, "colors.semantic.headingPrimary"),
    margin: 0,
    marginBottom: brand.spacing.unit * 2,
    fontWeight: 600,
  };

  const marker =
    number === null
      ? null
      : createElement(
          "span",
          {
            className: "doc-heading-number",
            "data-heading-number": number,
            style: { marginRight: "0.5em" },
          },
          number,
        );

  return createElement(
    TAG_BY_LEVEL[block.level],
    {
      "data-block-id": block.id,
      "data-block-type": "heading",
      "data-level": block.level,
      "data-numbered": block.numbered ? "true" : "false",
      style,
    },
    marker,
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

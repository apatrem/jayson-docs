/**
 * src/blocks/numbered-list/index.tsx — full runtime manifest for the NumberedList block.
 *
 * T-147: migrates content from src/editor/nodes/NumberedListNode.tsx and
 * src/renderer/blocks/NumberedList.tsx into this single file.
 *
 * Named exports: NumberedListTipTapNode, numberedListBlockToProseMirror,
 *   proseMirrorToNumberedListBlock, NumberedList, NumberedListProps
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type { NumberedListBlock, NumberedListItem } from "./schema";
import { NumberedListBlockSchema, emptyNumberedListItem } from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
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
    documentNumberedList: {
      insertNumberedList: (attrs?: {
        items?: NumberedListItem[];
        startAt?: number;
      }) => ReturnType;
    };
  }
}

export const NumberedListTipTapNode = Node.create({
  name: "numberedList",
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
      items: {
        default: [emptyNumberedListItem()],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-items");
          if (!raw) {
            return [emptyNumberedListItem()];
          }
          return JSON.parse(raw) as NumberedListItem[];
        },
        renderHTML: (attrs: { items: NumberedListItem[] }) => ({
          "data-items": JSON.stringify(attrs.items),
        }),
      },
      startAt: {
        default: null,
        parseHTML: (el) => {
          const raw = el.getAttribute("start");
          return raw === null ? null : Number(raw);
        },
        renderHTML: (attrs: { startAt: number | null }) =>
          attrs.startAt === null ? {} : { start: String(attrs.startAt) },
      },
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") ?? "",
        renderHTML: (attrs: { note: string }) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'ol[data-block-type="numbered-list"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "ol",
      mergeAttributes(HTMLAttributes, { "data-block-type": "numbered-list" }),
    ];
  },

  addCommands() {
    return {
      insertNumberedList:
        (attrs: { items?: NumberedListItem[]; startAt?: number } = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              items: attrs.items ?? [emptyNumberedListItem()],
              startAt: attrs.startAt ?? null,
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(NumberedListNodeView);
  },
});

const NumberedListNodeView: FC<NodeViewProps> = ({ node, selected }) => {
  const blockId = String(node.attrs.blockId);
  const startAtRaw = node.attrs.startAt as number | undefined;
  const block: NumberedListBlock = {
    id: blockId,
    type: "numbered-list",
    items: node.attrs.items as NumberedListItem[],
    ...(startAtRaw !== undefined ? { startAt: startAtRaw } : {}),
  };

  return (
    <NodeViewWrapper
      className="numbered-list-node-view"
      data-block-id={blockId}
      contentEditable={false}
      style={editorBlockStyle(selected)}
    >
      <NumberedList block={block} />
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

type NumberedListPmNode = {
  attrs: {
    blockId: string;
    items: NumberedListItem[];
    startAt: number | null;
    note: string;
  };
};

export function numberedListBlockToProseMirror(block: NumberedListBlock): {
  type: string;
  attrs: NumberedListPmNode["attrs"];
} {
  return {
    type: "numberedList",
    attrs: {
      blockId: block.id,
      items: block.items,
      startAt: block.startAt ?? null,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToNumberedListBlock(
  node: NumberedListPmNode,
): NumberedListBlock {
  return {
    id: node.attrs.blockId,
    type: "numbered-list",
    items: node.attrs.items,
    ...(node.attrs.startAt === null ? {} : { startAt: node.attrs.startAt }),
    ...(node.attrs.note ? { note: node.attrs.note } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface NumberedListProps {
  block: NumberedListBlock;
}

export const NumberedList: FC<NumberedListProps> = ({ block }) => {
  const brand = useBrandTokens();

  const listStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    margin: 0,
    paddingLeft: brand.spacing.unit * 5,
    listStyleType: "decimal",
  };

  return (
    <ol
      data-block-id={block.id}
      data-block-type="numbered-list"
      style={listStyle}
    >
      {block.items.map((item, index) => (
        <li key={index}>
          <ProseRenderer fragment={item.text} />
        </li>
      ))}
    </ol>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const numberedListBlock = defineBlock<NumberedListBlock>({
  schemaName: "numbered-list",
  schema: NumberedListBlockSchema as ZodType<NumberedListBlock>,
  allowedAttrs: ["items", "startAt", "note"] as const,
  paletteLabel: "Numbered List",
  tiptapNode: NumberedListTipTapNode,
  renderer: NumberedList,
  toPm: (block) => numberedListBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToNumberedListBlock(node as unknown as NumberedListPmNode),
});

export default numberedListBlock;

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
import type { JSONContent } from "@tiptap/react";
import type { ZodType } from "zod";
import type { CSSProperties, FC } from "react";

// ── Brand-token / renderer dependencies ──────────────────────────────────────
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../../renderer/ProseRenderer";

// ── Registry factory ─────────────────────────────────────────────────────────
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

// Shape of a ProseMirror paragraph-bearing fragment (item text) and a list item
// node. Items store their rich text directly as the list-item node's content;
// the DocModel item.text doc-fragment is `{ type: "doc", content: <paragraphs> }`.
type PmContentNode = { type?: string; content?: JSONContent[] };
const PARAGRAPH_FALLBACK: JSONContent = { type: "paragraph", content: [] };

function itemTextToPmContent(text: { content?: unknown[] }): JSONContent[] {
  const content = (text.content ?? []) as JSONContent[];
  return content.length > 0 ? content : [PARAGRAPH_FALLBACK];
}

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

// A single numbered-list item: holds the item's rich text as paragraph content.
export const NumberedListItemTipTapNode = Node.create({
  name: "numberedListItem",
  content: "paragraph+",
  defining: true,

  parseHTML() {
    return [{ tag: "li[data-list-item='numbered']" }];
  },

  renderHTML() {
    return ["li", { "data-list-item": "numbered" }, 0];
  },
});

export const NumberedListTipTapNode = Node.create({
  name: "numberedList",
  group: "block",
  content: "numberedListItem+",
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

  // Plain <ol> so the <li> children are direct descendants and the browser
  // renders list markers natively (a React node view would wrap the content in
  // an extra <div>, breaking list semantics). Font/colour inherit from the
  // editor surface; the read-only preview pane carries full brand styling.
  renderHTML({ HTMLAttributes }) {
    return [
      "ol",
      mergeAttributes(HTMLAttributes, {
        "data-block-type": "numbered-list",
        class: "numbered-list-node-view",
        style: "margin:0;padding-left:1.5rem;list-style-type:decimal;",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertNumberedList:
        (attrs: { items?: NumberedListItem[]; startAt?: number } = {}) =>
        ({ commands }) => {
          const items = attrs.items ?? [emptyNumberedListItem()];
          return commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              startAt: attrs.startAt ?? null,
              note: "",
            },
            content: items.map((item) => ({
              type: "numberedListItem",
              content: itemTextToPmContent(item.text),
            })),
          });
        },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type NumberedListPmNode = {
  attrs: {
    blockId: string;
    startAt: number | null;
    note: string;
  };
  content?: PmContentNode[];
};

export function numberedListBlockToProseMirror(block: NumberedListBlock): {
  type: string;
  attrs: NumberedListPmNode["attrs"];
  content: PmContentNode[];
} {
  return {
    type: "numberedList",
    attrs: {
      blockId: block.id,
      startAt: block.startAt ?? null,
      note: block.note ?? "",
    },
    content: block.items.map((item) => ({
      type: "numberedListItem",
      content: itemTextToPmContent(item.text),
    })),
  };
}

export function proseMirrorToNumberedListBlock(
  node: NumberedListPmNode,
): NumberedListBlock {
  const items: NumberedListItem[] = (node.content ?? []).map((li) => ({
    text: { type: "doc", content: li.content ?? [PARAGRAPH_FALLBACK] },
  }));
  return {
    id: node.attrs.blockId,
    type: "numbered-list",
    items: items.length > 0 ? items : [emptyNumberedListItem()],
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

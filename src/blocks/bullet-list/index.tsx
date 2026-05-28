/**
 * src/blocks/bullet-list/index.tsx — full runtime manifest for the BulletList block.
 *
 * T-146: migrates content from src/editor/nodes/BulletListNode.tsx and
 * src/renderer/blocks/BulletList.tsx into this single file.
 *
 * Named exports: BulletListTipTapNode, bulletListBlockToProseMirror,
 *   proseMirrorToBulletListBlock, BulletList, BulletListProps
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type { BulletListBlock, BulletListItem } from "./schema";
import { BulletListBlockSchema, emptyBulletListItem } from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import type { ResolvedPos } from "@tiptap/pm/model";
import type { ZodType } from "zod";
import type { CSSProperties, FC } from "react";

// ── Brand-token / renderer dependencies ──────────────────────────────────────
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../../renderer/ProseRenderer";

// ── Registry factory ─────────────────────────────────────────────────────────
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

// A ProseMirror node shape used while mapping list structure to/from the
// DocModel. Item text is the DocModel `{ type: "doc", content: <paragraphs> }`
// fragment; in the editor those paragraphs are the list-item node's content.
type PmContentNode = { type?: string; content?: PmContentNode[] };
const PARAGRAPH_FALLBACK: PmContentNode = { type: "paragraph", content: [] };

function itemTextToParagraphs(text: { content?: unknown[] }): PmContentNode[] {
  const content = (text.content ?? []) as PmContentNode[];
  return content.length > 0 ? content : [PARAGRAPH_FALLBACK];
}

function paragraphsToItemText(content: PmContentNode[]): BulletListItem["text"] {
  return {
    type: "doc",
    content: content.length > 0 ? content : [PARAGRAPH_FALLBACK],
  } as BulletListItem["text"];
}

// ─────────────────────────────────────────────────────────────────────────────
// TipTap node
// ─────────────────────────────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentBulletList: {
      insertBulletList: (attrs?: { items?: BulletListItem[] }) => ReturnType;
    };
  }
}

// Builds the editor node for one DocModel bullet item (paragraphs + optional
// nested sub-list). Shared by the insert command and the toPm mapping.
function bulletItemToPmNode(item: BulletListItem): PmContentNode {
  const content: PmContentNode[] = [...itemTextToParagraphs(item.text)];
  if (item.children && item.children.length > 0) {
    content.push({
      type: "subBulletList",
      content: item.children.map((child) => ({
        type: "subBulletItem",
        content: itemTextToParagraphs(child.text),
      })),
    });
  }
  return { type: "bulletListItem", content };
}

// ── Nesting commands (Tab = sink, Shift-Tab = lift) ──────────────────────────
// Depth of the nearest ancestor of the given node-type name, or null.
function ancestorDepth(pos: ResolvedPos, typeName: string): number | null {
  for (let d = pos.depth; d > 0; d--) {
    if (pos.node(d).type.name === typeName) return d;
  }
  return null;
}

// Tab: demote the current top-level bullet item into the previous sibling's
// sub-list (creating the sub-list if needed). Caps at one level: an item that
// already has children can't be sunk.
export function sinkBulletItem(
  state: EditorState,
  tr: Transaction,
  dispatch: ((tr: Transaction) => void) | undefined,
): boolean {
  const { $from } = state.selection;
  const itemDepth = ancestorDepth($from, "bulletListItem");
  if (itemDepth === null) return false;
  const listDepth = itemDepth - 1;
  if ($from.node(listDepth).type.name !== "bulletList") return false;
  const index = $from.index(listDepth);
  if (index === 0) return true; // no previous sibling to nest under
  const list = $from.node(listDepth);
  const item = list.child(index);
  if (item.lastChild?.type.name === "subBulletList") return true; // already has children
  const prev = list.child(index - 1);
  const { schema } = state;
  const subItem = schema.nodes["subBulletItem"]!.create(null, item.content);
  let newPrev;
  if (prev.lastChild?.type.name === "subBulletList") {
    const newSubList = prev.lastChild.copy(prev.lastChild.content.addToEnd(subItem));
    newPrev = prev.copy(prev.content.replaceChild(prev.childCount - 1, newSubList));
  } else {
    const subList = schema.nodes["subBulletList"]!.create(null, subItem);
    newPrev = prev.copy(prev.content.addToEnd(subList));
  }
  const itemEnd = $from.after(itemDepth);
  const prevStart = $from.before(itemDepth) - prev.nodeSize;
  tr.replaceWith(prevStart, itemEnd, newPrev);
  if (dispatch) {
    const target = TextSelection.near(tr.doc.resolve(prevStart + newPrev.nodeSize - 2));
    dispatch(tr.setSelection(target).scrollIntoView());
  }
  return true;
}

// Shift-Tab: promote the (last) sub-bullet back to a top-level item after its
// parent. Only the last sub-item is liftable in this pass (keeps order intact).
export function liftSubBulletItem(
  state: EditorState,
  tr: Transaction,
  dispatch: ((tr: Transaction) => void) | undefined,
): boolean {
  const { $from } = state.selection;
  const subItemDepth = ancestorDepth($from, "subBulletItem");
  if (subItemDepth === null) return false;
  const subListDepth = subItemDepth - 1;
  const parentItemDepth = subItemDepth - 2;
  const subList = $from.node(subListDepth);
  const subIndex = $from.index(subListDepth);
  if (subIndex !== subList.childCount - 1) return true; // only last sub-item
  const subItem = $from.node(subItemDepth);
  const newItem = state.schema.nodes["bulletListItem"]!.create(null, subItem.content);
  const parentItemEnd = $from.after(parentItemDepth);
  if (subList.childCount === 1) {
    const subListStart = $from.before(subListDepth);
    const subListEnd = $from.after(subListDepth);
    tr.delete(subListStart, subListEnd);
    tr.insert(subListStart, newItem);
    if (dispatch) {
      dispatch(
        tr
          .setSelection(TextSelection.near(tr.doc.resolve(subListStart + 1)))
          .scrollIntoView(),
      );
    }
  } else {
    const subItemStart = $from.before(subItemDepth);
    const subItemEnd = $from.after(subItemDepth);
    tr.delete(subItemStart, subItemEnd);
    const insertPos = parentItemEnd - (subItemEnd - subItemStart);
    tr.insert(insertPos, newItem);
    if (dispatch) {
      dispatch(
        tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1))).scrollIntoView(),
      );
    }
  }
  return true;
}

// Nested sub-bullet item. Its content is paragraphs only — no further nesting,
// which caps depth at exactly 1 level (the DocModel `children` shape).
export const SubBulletItemTipTapNode = Node.create({
  name: "subBulletItem",
  content: "paragraph+",
  defining: true,
  renderHTML() {
    return ["li", { "data-list-item": "sub-bullet" }, 0];
  },
});

// The nested sub-list holding sub-bullet items.
export const SubBulletListTipTapNode = Node.create({
  name: "subBulletList",
  content: "subBulletItem+",
  defining: true,
  renderHTML() {
    return [
      "ul",
      {
        "data-sub-bullet-list": "true",
        style: "margin:0;padding-left:1.25rem;list-style-type:circle;",
      },
      0,
    ];
  },
});

// Top-level bullet item: text paragraph(s) then an optional sub-list.
export const BulletListItemTipTapNode = Node.create({
  name: "bulletListItem",
  content: "paragraph+ subBulletList?",
  defining: true,
  renderHTML() {
    return ["li", { "data-list-item": "bullet" }, 0];
  },
});

export const BulletListTipTapNode = Node.create({
  name: "bulletList",
  group: "block",
  content: "bulletListItem+",
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
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") ?? "",
        renderHTML: (attrs: { note: string }) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'ul[data-block-type="bullet-list"]' }];
  },

  // Plain <ul> so list markers render natively (a React node view would wrap
  // the content in an extra <div>, breaking list semantics). Font/colour
  // inherit from the editor surface; the preview pane carries brand styling.
  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(HTMLAttributes, {
        "data-block-type": "bullet-list",
        class: "bullet-list-node-view",
        style: "margin:0;padding-left:1.5rem;list-style-type:disc;",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertBulletList:
        (attrs: { items?: BulletListItem[] } = {}) =>
        ({ commands }) => {
          const items = attrs.items ?? [emptyBulletListItem()];
          return commands.insertContent({
            type: this.name,
            attrs: { blockId: crypto.randomUUID(), note: "" },
            content: items.map(bulletItemToPmNode),
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () =>
        this.editor.commands.command(({ state, tr, dispatch }) =>
          sinkBulletItem(state, tr, dispatch),
        ),
      "Shift-Tab": () =>
        this.editor.commands.command(({ state, tr, dispatch }) =>
          liftSubBulletItem(state, tr, dispatch),
        ),
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type BulletListPmNode = {
  attrs: {
    blockId: string;
    note: string;
  };
  content?: PmContentNode[];
};

export function bulletListBlockToProseMirror(block: BulletListBlock): {
  type: string;
  attrs: BulletListPmNode["attrs"];
  content: PmContentNode[];
} {
  return {
    type: "bulletList",
    attrs: {
      blockId: block.id,
      note: block.note ?? "",
    },
    content: block.items.map(bulletItemToPmNode),
  };
}

export function proseMirrorToBulletListBlock(
  node: BulletListPmNode,
): BulletListBlock {
  const items: BulletListItem[] = (node.content ?? []).map((li) => {
    const children = li.content ?? [];
    const paragraphs = children.filter((c) => c.type === "paragraph");
    const subList = children.find((c) => c.type === "subBulletList");
    const item: BulletListItem = { text: paragraphsToItemText(paragraphs) };
    const subItems = subList?.content ?? [];
    if (subItems.length > 0) {
      item.children = subItems.map((si) => ({
        text: paragraphsToItemText((si.content ?? []).filter((c) => c.type === "paragraph")),
      }));
    }
    return item;
  });
  return {
    id: node.attrs.blockId,
    type: "bullet-list",
    items: items.length > 0 ? items : [emptyBulletListItem()],
    note: node.attrs.note || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface BulletListProps {
  block: BulletListBlock;
}

export const BulletList: FC<BulletListProps> = ({ block }) => {
  const brand = useBrandTokens();

  const listStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    margin: 0,
    paddingLeft: brand.spacing.unit * 5,
    listStyleType: "disc",
  };

  const nestedStyle: CSSProperties = {
    marginTop: brand.spacing.unit,
    paddingLeft: brand.spacing.unit * 4,
    listStyleType: "circle",
  };

  return (
    <ul
      data-block-id={block.id}
      data-block-type="bullet-list"
      style={listStyle}
    >
      {block.items.map((item, index) => (
        <li key={index}>
          <ProseRenderer fragment={item.text} />
          {item.children && item.children.length > 0 ? (
            <ul style={nestedStyle}>
              {item.children.map((child, childIndex) => (
                <li key={childIndex}>
                  <ProseRenderer fragment={child.text} />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const bulletListBlock = defineBlock<BulletListBlock>({
  schemaName: "bullet-list",
  schema: BulletListBlockSchema as ZodType<BulletListBlock>,
  allowedAttrs: ["items", "note"] as const,
  paletteLabel: "Bullet List",
  tiptapNode: BulletListTipTapNode,
  renderer: BulletList,
  toPm: (block) => bulletListBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToBulletListBlock(node as unknown as BulletListPmNode),
});

export default bulletListBlock;

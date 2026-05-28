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
import { BulletListPanel } from "./BulletListPanel";
import type { ProseMirrorNode } from "../../editor/mapping";

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

export const BulletListTipTapNode = Node.create({
  name: "bulletList",
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
        default: [emptyBulletListItem()],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-items");
          if (!raw) {
            return [emptyBulletListItem()];
          }
          return JSON.parse(raw) as BulletListItem[];
        },
        renderHTML: (attrs: { items: BulletListItem[] }) => ({
          "data-items": JSON.stringify(attrs.items),
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

  renderHTML({ HTMLAttributes }) {
    return [
      "ul",
      mergeAttributes(HTMLAttributes, { "data-block-type": "bullet-list" }),
    ];
  },

  addCommands() {
    return {
      insertBulletList:
        (attrs: { items?: BulletListItem[] } = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              items: attrs.items ?? [emptyBulletListItem()],
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(BulletListNodeView);
  },
});

const BulletListNodeView: FC<NodeViewProps> = ({ node, selected }) => {
  const blockId = String(node.attrs.blockId);
  const block: BulletListBlock = {
    id: blockId,
    type: "bullet-list",
    items: node.attrs.items as BulletListItem[],
  };

  return (
    <NodeViewWrapper
      className="bullet-list-node-view"
      data-block-id={blockId}
      contentEditable={false}
      style={editorBlockStyle(selected)}
    >
      <BulletList block={block} />
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

type BulletListPmNode = {
  attrs: {
    blockId: string;
    items: BulletListItem[];
    note: string;
  };
};

export function bulletListBlockToProseMirror(block: BulletListBlock): {
  type: string;
  attrs: BulletListPmNode["attrs"];
} {
  return {
    type: "bulletList",
    attrs: {
      blockId: block.id,
      items: block.items,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToBulletListBlock(
  node: BulletListPmNode,
): BulletListBlock {
  return {
    id: node.attrs.blockId,
    type: "bullet-list",
    items: node.attrs.items,
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
  panel: BulletListPanel,
});

export default bulletListBlock;

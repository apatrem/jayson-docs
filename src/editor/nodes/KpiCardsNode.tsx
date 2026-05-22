import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import {
  defaultKpiCard,
  type KpiCard,
  type KpiCardsBlock,
} from "../../schema/blocks/kpi-cards";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    kpiCards: {
      insertKpiCards: (attrs?: { cards?: KpiCard[] }) => ReturnType;
    };
  }
}

export const KpiCardsTipTapNode = Node.create({
  name: "kpiCards",
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
      cards: {
        default: [defaultKpiCard()],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-cards");
          if (!raw) {
            return [defaultKpiCard()];
          }
          return JSON.parse(raw) as KpiCard[];
        },
        renderHTML: (attrs: { cards: KpiCard[] }) => ({
          "data-cards": JSON.stringify(attrs.cards),
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
    return [{ tag: 'div[data-block-type="kpi-cards"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "kpi-cards" }),
    ];
  },

  addCommands() {
    return {
      insertKpiCards:
        (attrs = {}) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              cards: attrs.cards ?? [defaultKpiCard()],
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(KpiCardsNodeView);
  },
});

const KpiCardsNodeView: FC<NodeViewProps> = ({ node }) => {
  const cards = node.attrs.cards as KpiCard[];

  return (
    <NodeViewWrapper className="kpi-cards-node-view">
      <span>
        KPI cards ({cards.length} card{cards.length === 1 ? "" : "s"})
      </span>
    </NodeViewWrapper>
  );
};

type KpiCardsPmNode = {
  attrs: {
    blockId: string;
    cards: KpiCard[];
    note: string;
  };
};

export function kpiCardsBlockToProseMirror(block: KpiCardsBlock): {
  type: string;
  attrs: KpiCardsPmNode["attrs"];
} {
  return {
    type: "kpiCards",
    attrs: {
      blockId: block.id,
      cards: block.cards,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToKpiCardsBlock(node: KpiCardsPmNode): KpiCardsBlock {
  return {
    id: node.attrs.blockId,
    type: "kpi-cards",
    cards: node.attrs.cards,
    note: node.attrs.note || undefined,
  };
}

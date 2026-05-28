/**
 * src/blocks/kpi-cards/index.tsx — self-contained registry manifest for the
 * KPI Cards block.
 *
 * Folds in the legacy KpiCardsNode.tsx (editor) and KpiCards.tsx (renderer)
 * into a single co-located file. Default-exports the BlockRegistryRecord
 * consumed by src/blocks/runtime-registry.ts.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { CSSProperties, ComponentType, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { lookupBrandPath, resolveBrandToken } from "../../brand-tokens/resolve";
import type { BrandTokens } from "../../schema/brand";
import { defineBlock } from "../defineBlock";
import { KpiCardsPanel } from "./KpiCardsPanel";
import type { ProseMirrorNode } from "../../editor/mapping";
import type { ZodType } from "zod";
import {
  KpiCardsBlockSchema,
  defaultKpiCard,
  kpiEmphasisColorRef,
  kpiTrendColorRef,
  type KpiCard,
  type KpiCardsBlock,
  type KpiTrend,
} from "./schema";

// ── Re-exports for backward compatibility ─────────────────────────────────
export {
  KpiTrendSchema,
  KpiEmphasisSchema,
  KpiCardSchema,
  KpiCardsBlockSchema,
  defaultKpiCard,
  kpiEmphasisColorRef,
  kpiTrendColorRef,
  type KpiTrend,
  type KpiEmphasis,
  type KpiCard,
  type KpiCardsBlock,
} from "./schema";

// ── TipTap commands augmentation ─────────────────────────────────────────
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    kpiCards: {
      insertKpiCards: (attrs?: { cards?: KpiCard[] }) => ReturnType;
    };
  }
}

// ── TipTap node ───────────────────────────────────────────────────────────
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

// ── NodeView (editor) ─────────────────────────────────────────────────────
// Data editing lives in KpiCardsPanel.tsx, mounted by DocumentView when the
// block is selected. This NodeView renders only the visual + selection outline.

const KpiCardsNodeView: FC<NodeViewProps> = ({ node, selected }) => {
  const blockId = node.attrs.blockId as string;
  const block: KpiCardsBlock = {
    id: blockId,
    type: "kpi-cards",
    cards: node.attrs.cards as KpiCard[],
  };

  return (
    <NodeViewWrapper
      className="kpi-cards-node-view"
      data-block-id={blockId}
      contentEditable={false}
      style={{
        outline: selected ? "2px solid var(--brand-primary, #0B3D91)" : "none",
        outlineOffset: 4,
        cursor: "pointer",
      }}
    >
      <KpiCards block={block} />
    </NodeViewWrapper>
  );
};

// ── PM helpers ────────────────────────────────────────────────────────────
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

// ── Renderer ──────────────────────────────────────────────────────────────
const TREND_GLYPH: Record<KpiTrend, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
  none: "",
};

function kpiValueFontSize(brand: BrandTokens): number {
  const deckTitle = lookupBrandPath(brand, "typography.scale.deckTitle");
  if (typeof deckTitle === "number") {
    return deckTitle;
  }
  const h1 = lookupBrandPath(brand, "typography.scale.h1");
  if (typeof h1 === "number") {
    return h1;
  }
  return 32;
}

export interface KpiCardsProps {
  block: KpiCardsBlock;
}

export const KpiCards: FC<KpiCardsProps> = ({ block }) => {
  const brand = useBrandTokens();
  const valueSize = kpiValueFontSize(brand);
  const labelColor = resolveBrandToken(brand, "colors.semantic.textSecondary");

  const rowStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: brand.spacing.unit * 4,
    fontFamily: brand.typography.fonts.body.family,
  };

  const cardStyle: CSSProperties = {
    flex: "1 1 140px",
    minWidth: 120,
    padding: brand.spacing.unit * 3,
    borderRadius: 4,
    backgroundColor: resolveBrandToken(
      brand,
      "colors.semantic.surfaceBackground",
    ),
    border: `1px solid ${resolveBrandToken(brand, "colors.semantic.border")}`,
  };

  const labelStyle: CSSProperties = {
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: labelColor,
    marginTop: brand.spacing.unit,
  };

  const sublabelStyle: CSSProperties = {
    ...labelStyle,
    fontSize: brand.typography.scale.caption,
    marginTop: brand.spacing.unit / 2,
  };

  return (
    <div
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="kpi-cards"
      style={rowStyle}
      role="group"
      aria-label="KPI cards"
    >
      {block.cards.map((card, index) => {
        const emphasis = card.emphasis ?? "neutral";
        const trend = card.trend ?? "none";
        const valueColor = resolveBrandToken(
          brand,
          kpiEmphasisColorRef(emphasis),
        );
        const trendGlyph = TREND_GLYPH[trend];
        const trendColor =
          trend === "none"
            ? undefined
            : resolveBrandToken(brand, kpiTrendColorRef(trend));

        const valueStyle: CSSProperties = {
          fontFamily: brand.typography.fonts.heading.family,
          fontSize: valueSize,
          lineHeight: brand.typography.lineHeight.tight,
          fontWeight: 700,
          color: valueColor,
          margin: 0,
        };

        return (
          <article key={index} style={cardStyle}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <p style={valueStyle}>{card.value}</p>
              {trendGlyph ? (
                <span
                  aria-label={`trend ${trend}`}
                  style={{
                    fontSize: brand.typography.scale.bodyLg ?? valueSize * 0.5,
                    color: trendColor,
                    lineHeight: 1,
                  }}
                >
                  {trendGlyph}
                </span>
              ) : null}
            </div>
            <p style={labelStyle}>{card.label}</p>
            {card.sublabel ? <p style={sublabelStyle}>{card.sublabel}</p> : null}
          </article>
        );
      })}
    </div>
  );
};

// ── Registry manifest ─────────────────────────────────────────────────────
const kpiCardsBlock = defineBlock<KpiCardsBlock>({
  schemaName: "kpi-cards",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: KpiCardsBlockSchema as ZodType<KpiCardsBlock>,
  allowedAttrs: ["cards", "note"] as const,
  paletteLabel: "KPI Cards",
  tiptapNode: KpiCardsTipTapNode,
  renderer: KpiCards as ComponentType<{ block: KpiCardsBlock }>,
  toPm: (block) => kpiCardsBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToKpiCardsBlock(
      node as unknown as Parameters<typeof proseMirrorToKpiCardsBlock>[0],
    ),
  panel: KpiCardsPanel,
});

export default kpiCardsBlock;

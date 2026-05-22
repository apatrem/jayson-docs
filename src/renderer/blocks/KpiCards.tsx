import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { lookupBrandPath, resolveBrandToken } from "../../brand-tokens/resolve";
import type { BrandTokens } from "../../schema/brand";
import type { KpiCardsBlock, KpiTrend } from "../../schema/blocks/kpi-cards";
import {
  kpiEmphasisColorRef,
  kpiTrendColorRef,
} from "../../schema/blocks/kpi-cards";

export interface KpiCardsProps {
  block: KpiCardsBlock;
}

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

const TREND_GLYPH: Record<KpiTrend, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
  none: "",
};

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

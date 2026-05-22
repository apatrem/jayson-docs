import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { lookupBrandPath, resolveBrandToken } from "../../brand-tokens/resolve";
import type { DividerBlock } from "../../schema/blocks/divider";

export type DividerRenderContext = "document" | "deck";

export interface DividerProps {
  block: DividerBlock;
  context?: DividerRenderContext;
}

function deckTitleSize(brand: ReturnType<typeof useBrandTokens>): number {
  const deckTitle = lookupBrandPath(brand, "typography.scale.deckTitle");
  if (typeof deckTitle === "number") {
    return deckTitle;
  }
  return brand.typography.scale.h1 ?? brand.typography.scale.h2 ?? 32;
}

export const Divider: FC<DividerProps> = ({ block, context = "document" }) => {
  const brand = useBrandTokens();

  if (context === "deck") {
    const background = resolveBrandToken(brand, "colors.brand.dark");
    const textColor = resolveBrandToken(brand, "colors.neutral.0");
    const subtitleColor = resolveBrandToken(brand, "colors.brand.light");

    const slideStyle: CSSProperties = {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: brand.deck.dimensionsPx.height,
      padding: brand.deck.margins.top,
      backgroundColor: background,
      color: textColor,
      fontFamily: brand.typography.fonts.heading.family,
      textAlign: "center",
      marginBottom: brand.spacing.unit * 3,
    };

    const numberingStyle: CSSProperties = {
      margin: 0,
      marginBottom: brand.spacing.unit * 2,
      fontSize: brand.typography.scale.bodyLg ?? brand.typography.scale.h4,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: subtitleColor,
    };

    const labelStyle: CSSProperties = {
      margin: 0,
      fontSize: deckTitleSize(brand),
      fontWeight: 600,
      lineHeight: brand.typography.lineHeight.tight,
    };

    const subtitleStyle: CSSProperties = {
      margin: 0,
      marginTop: brand.spacing.unit * 2,
      fontSize: brand.typography.scale.h3,
      fontWeight: 400,
      color: subtitleColor,
      fontFamily: brand.typography.fonts.body.family,
    };

    return (
      <section
        data-block-id={block.id}
        data-block-type="divider"
        data-render-context="deck"
        style={slideStyle}
        role="doc-pagebreak"
      >
        {block.numbering ? <p style={numberingStyle}>{block.numbering}</p> : null}
        {block.label ? <h2 style={labelStyle}>{block.label}</h2> : null}
        {block.subtitle ? <p style={subtitleStyle}>{block.subtitle}</p> : null}
      </section>
    );
  }

  const breakStyle: CSSProperties = {
    breakBefore: "page",
    pageBreakBefore: "always",
    height: 0,
    margin: 0,
    border: "none",
    padding: 0,
  };

  return (
    <hr
      className="doc-page-break"
      data-block-id={block.id}
      data-block-type="divider"
      data-render-context="document"
      style={breakStyle}
      aria-hidden="true"
    />
  );
};

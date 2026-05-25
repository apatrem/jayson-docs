import type { CSSProperties, FC, ReactNode } from "react";
import type { AssetContext } from "../../brand-tokens/resolve-asset";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import type { Block } from "../../schema/blocks";
import type { DocModel } from "../../schema/docmodel";
import type { Slide } from "../../schema/containers";
import { BlockView } from "../DocumentRenderer";

export type DeckModel = Extract<DocModel, { kind: "deck" }>;

export interface SlideLayoutProps {
  deck: DeckModel;
  slide: Slide;
  slideNumber: number;
  slideCount: number;
  assetContext: AssetContext;
  diagramSvgs: Record<string, string>;
  chartSvgs: Record<string, string>;
}

export type SlideLayoutComponent = FC<SlideLayoutProps>;

export function SlideFrame({
  deck,
  slide,
  slideNumber,
  slideCount,
  variant = "standard",
  contentStyle,
  children,
}: SlideLayoutProps & {
  variant?: "standard" | "cover" | "section";
  contentStyle?: CSSProperties;
  children: ReactNode;
}): ReactNode {
  const brand = useBrandTokens();
  const isInverted = variant === "cover" || variant === "section";
  const backgroundColor = isInverted
    ? resolveBrandToken(brand, "colors.brand.dark")
    : resolveBrandToken(brand, "colors.semantic.pageBackground");
  const color = isInverted
    ? resolveBrandToken(brand, "colors.neutral.0")
    : resolveBrandToken(brand, "colors.semantic.textPrimary");
  const accentColor = isInverted
    ? resolveBrandToken(brand, "colors.brand.light")
    : resolveBrandToken(brand, "colors.brand.primary");
  const titleBarHeight =
    brand.deck.titleBar?.enabled === true ? (brand.deck.titleBar.heightPx ?? 0) : 0;
  const footerHeight =
    brand.deck.footer?.enabled === true ? (brand.deck.footer.heightPx ?? 0) : 0;
  const slidePadding = `${brand.deck.margins.top}px ${brand.deck.margins.right}px ${brand.deck.margins.bottom}px ${brand.deck.margins.left}px`;
  const slideStyle: CSSProperties = {
    boxSizing: "border-box",
    width: brand.deck.dimensionsPx.width,
    minHeight: brand.deck.dimensionsPx.height,
    padding: slidePadding,
    margin: `0 auto ${brand.spacing.unit * 4}px auto`,
    breakAfter: "page",
    pageBreakAfter: "always",
    backgroundColor,
    color,
    fontFamily: brand.typography.fonts.body.family,
    display: "grid",
    gridTemplateRows: `${titleBarHeight}px minmax(0, 1fr) ${footerHeight}px`,
    gap: brand.spacing.unit * 2,
  };
  const headerStyle: CSSProperties = {
    margin: 0,
    color: accentColor,
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.h4,
    lineHeight: brand.typography.lineHeight.tight,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };
  const footerStyle: CSSProperties = {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    color: accentColor,
    fontSize: brand.typography.scale.caption ?? brand.typography.scale.bodySm,
  };
  const baseContentStyle: CSSProperties = {
    minHeight: 0,
    display: "grid",
    alignContent: "start",
    gap: brand.spacing.unit * 3,
    ...contentStyle,
  };

  return (
    <section
      data-slide-id={slide.id}
      data-slide-layout={slide.layout}
      style={slideStyle}
    >
      {titleBarHeight > 0 ? (
        <p style={headerStyle}>{deck.meta.project}</p>
      ) : (
        <span aria-hidden="true" />
      )}
      <div data-slide-content style={baseContentStyle}>
        {children}
      </div>
      {footerHeight > 0 ? (
        <footer style={footerStyle}>
          <span>{deck.meta.confidentialityLevel}</span>
          <span>
            {slideNumber} / {slideCount}
          </span>
        </footer>
      ) : (
        <span aria-hidden="true" />
      )}
    </section>
  );
}

export function SlideBlocks({
  blocks,
  assetContext,
  diagramSvgs,
  chartSvgs,
}: {
  blocks: Block[];
  assetContext: AssetContext;
  diagramSvgs: Record<string, string>;
  chartSvgs: Record<string, string>;
}): ReactNode {
  return blocks.map((block) => (
    <BlockView
      key={block.id}
      block={block}
      assetContext={assetContext}
      diagramSvgs={diagramSvgs}
      chartSvgs={chartSvgs}
      dividerContext="deck"
    />
  ));
}

export function CoverFallback({ deck }: { deck: DeckModel }): ReactNode {
  const brand = useBrandTokens();
  const titleStyle: CSSProperties = {
    margin: 0,
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.deckTitle ?? brand.typography.scale.h1,
    lineHeight: brand.typography.lineHeight.tight,
    fontWeight: 600,
  };
  const subtitleStyle: CSSProperties = {
    margin: 0,
    marginTop: brand.spacing.unit * 2,
    fontSize: brand.typography.scale.h3,
    color: resolveBrandToken(brand, "colors.brand.light"),
  };

  return (
    <div>
      <h1 style={titleStyle}>{deck.meta.project}</h1>
      <p style={subtitleStyle}>{deck.meta.client}</p>
    </div>
  );
}

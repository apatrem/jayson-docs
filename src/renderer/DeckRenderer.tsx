import type { CSSProperties, FC } from "react";
import { BrandProvider } from "../brand-tokens/BrandProvider";
import type { AssetContext } from "../brand-tokens/resolve-asset";
import { useBrandTokens } from "../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../brand-tokens/resolve";
import type { BrandTokens } from "../schema/brand";
import type { DocModel } from "../schema/docmodel";
import type { Slide } from "../schema/containers";
import { BlockView } from "./DocumentRenderer";

export type DeckModel = Extract<DocModel, { kind: "deck" }>;

export interface DeckRendererProps {
  deck: DeckModel;
  brand: BrandTokens;
  sharedFolderPath?: string;
  docFolderPath?: string;
  diagramSvgs?: Record<string, string>;
  chartSvgs?: Record<string, string>;
}

export const DeckRenderer: FC<DeckRendererProps> = ({
  deck,
  brand,
  sharedFolderPath = "/shared",
  docFolderPath = "/docs",
  diagramSvgs = {},
  chartSvgs = {},
}) => {
  const assetContext: AssetContext = {
    sharedFolderPath,
    docFolderPath,
    brand,
  };

  return (
    <BrandProvider tokens={brand}>
      <DeckBody
        deck={deck}
        assetContext={assetContext}
        diagramSvgs={diagramSvgs}
        chartSvgs={chartSvgs}
      />
    </BrandProvider>
  );
};

const DeckBody: FC<{
  deck: DeckModel;
  assetContext: AssetContext;
  diagramSvgs: Record<string, string>;
  chartSvgs: Record<string, string>;
}> = ({ deck, assetContext, diagramSvgs, chartSvgs }) => {
  const brand = useBrandTokens();
  const canvasStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    backgroundColor: resolveBrandToken(brand, "colors.semantic.pageBackground"),
    margin: 0,
    padding: brand.spacing.unit * 2,
  };

  return (
    <article data-doc-kind="deck" style={canvasStyle}>
      {deck.slides.map((slide) => (
        <DeckSlide
          key={slide.id}
          slide={slide}
          assetContext={assetContext}
          diagramSvgs={diagramSvgs}
          chartSvgs={chartSvgs}
        />
      ))}
    </article>
  );
};

const DeckSlide: FC<{
  slide: Slide;
  assetContext: AssetContext;
  diagramSvgs: Record<string, string>;
  chartSvgs: Record<string, string>;
}> = ({ slide, assetContext, diagramSvgs, chartSvgs }) => {
  const brand = useBrandTokens();

  return (
    <section
      data-slide-id={slide.id}
      data-slide-layout={slide.layout}
      style={{
        marginBottom: brand.spacing.unit * 6,
        minHeight: brand.deck.dimensionsPx.height,
        padding: brand.deck.margins.top,
      }}
    >
      {slide.blocks.map((block) => (
        <BlockView
          key={block.id}
          block={block}
          assetContext={assetContext}
          diagramSvgs={diagramSvgs}
          chartSvgs={chartSvgs}
          dividerContext="deck"
        />
      ))}
    </section>
  );
};

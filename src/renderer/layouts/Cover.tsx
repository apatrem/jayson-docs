import type { FC } from "react";
import {
  CoverFallback,
  SlideBlocks,
  SlideFrame,
  type SlideLayoutProps,
} from "./shared";

export const CoverLayout: FC<SlideLayoutProps> = ({
  deck,
  slide,
  assetContext,
  diagramSvgs,
  chartSvgs,
  ...frameProps
}) => (
  <SlideFrame
    deck={deck}
    slide={slide}
    assetContext={assetContext}
    diagramSvgs={diagramSvgs}
    chartSvgs={chartSvgs}
    {...frameProps}
    variant="cover"
    contentStyle={{ alignContent: "center", textAlign: "center" }}
  >
    {slide.blocks.length === 0 ? (
      <CoverFallback deck={deck} />
    ) : (
      <SlideBlocks
        blocks={slide.blocks}
        assetContext={assetContext}
        diagramSvgs={diagramSvgs}
        chartSvgs={chartSvgs}
      />
    )}
  </SlideFrame>
);

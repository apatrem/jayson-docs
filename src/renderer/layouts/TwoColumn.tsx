import type { FC } from "react";
import { SlideBlocks, SlideFrame, type SlideLayoutProps } from "./shared";

export const TwoColumnLayout: FC<SlideLayoutProps> = ({
  slide,
  assetContext,
  diagramSvgs,
  chartSvgs,
  ...frameProps
}) => (
  <SlideFrame
    slide={slide}
    assetContext={assetContext}
    diagramSvgs={diagramSvgs}
    chartSvgs={chartSvgs}
    {...frameProps}
    contentStyle={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
  >
    <SlideBlocks
      blocks={slide.blocks}
      assetContext={assetContext}
      diagramSvgs={diagramSvgs}
      chartSvgs={chartSvgs}
    />
  </SlideFrame>
);

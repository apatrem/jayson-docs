import type { FC } from "react";
import { SlideBlocks, SlideFrame, type SlideLayoutProps } from "./shared";

export const ClosingLayout: FC<SlideLayoutProps> = ({
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
    contentStyle={{ alignContent: "center" }}
  >
    <SlideBlocks
      blocks={slide.blocks}
      assetContext={assetContext}
      diagramSvgs={diagramSvgs}
      chartSvgs={chartSvgs}
    />
  </SlideFrame>
);

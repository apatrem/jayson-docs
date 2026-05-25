import type { FC } from "react";
import { SlideBlocks, SlideFrame, type SlideLayoutProps } from "./shared";

export const ImageCaptionLayout: FC<SlideLayoutProps> = ({
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
    contentStyle={{ gridTemplateRows: "minmax(0, 1fr) auto" }}
  >
    <SlideBlocks
      blocks={slide.blocks}
      assetContext={assetContext}
      diagramSvgs={diagramSvgs}
      chartSvgs={chartSvgs}
    />
  </SlideFrame>
);

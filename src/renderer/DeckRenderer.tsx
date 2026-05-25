import type { CSSProperties, FC } from "react";
import { BrandProvider } from "../brand-tokens/BrandProvider";
import type { AssetContext } from "../brand-tokens/resolve-asset";
import { useBrandTokens } from "../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../brand-tokens/resolve";
import type { BrandTokens } from "../schema/brand";
import type { SlideLayout } from "../schema/containers";
import { AgendaLayout } from "./layouts/Agenda";
import { ChartCommentaryLayout } from "./layouts/ChartCommentary";
import { ChartFullLayout } from "./layouts/ChartFull";
import { ClosingLayout } from "./layouts/Closing";
import { CoverLayout } from "./layouts/Cover";
import { ImageCaptionLayout } from "./layouts/ImageCaption";
import { KpisLayout } from "./layouts/Kpis";
import { ProcessTimelineLayout } from "./layouts/ProcessTimeline";
import { QuoteLayout } from "./layouts/Quote";
import { SectionDividerLayout } from "./layouts/SectionDivider";
import { TableLayout } from "./layouts/Table";
import { TeamLayout } from "./layouts/Team";
import { ThreeColumnLayout } from "./layouts/ThreeColumn";
import { TitleBodyLayout } from "./layouts/TitleBody";
import { TwoColumnLayout } from "./layouts/TwoColumn";
import type {
  DeckModel,
  SlideLayoutComponent,
  SlideLayoutProps,
} from "./layouts/shared";

export type { DeckModel } from "./layouts/shared";

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
      {deck.slides.map((slide, index) => (
        <DeckSlide
          key={slide.id}
          deck={deck}
          slide={slide}
          slideNumber={index + 1}
          slideCount={deck.slides.length}
          assetContext={assetContext}
          diagramSvgs={diagramSvgs}
          chartSvgs={chartSvgs}
        />
      ))}
    </article>
  );
};

const SLIDE_LAYOUTS = {
  cover: CoverLayout,
  "section-divider": SectionDividerLayout,
  agenda: AgendaLayout,
  "title-body": TitleBodyLayout,
  "two-column": TwoColumnLayout,
  "three-column": ThreeColumnLayout,
  "chart-full": ChartFullLayout,
  "chart-commentary": ChartCommentaryLayout,
  table: TableLayout,
  quote: QuoteLayout,
  "process-timeline": ProcessTimelineLayout,
  team: TeamLayout,
  kpis: KpisLayout,
  "image-caption": ImageCaptionLayout,
  closing: ClosingLayout,
} satisfies Record<SlideLayout, SlideLayoutComponent>;

const DeckSlide: FC<SlideLayoutProps> = (props) => {
  const Layout = SLIDE_LAYOUTS[props.slide.layout];
  return <Layout {...props} />;
};

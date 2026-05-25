import type { CSSProperties, FC, ReactNode } from "react";
import { BrandProvider } from "../brand-tokens/BrandProvider";
import type { AssetContext } from "../brand-tokens/resolve-asset";
import { useBrandTokens } from "../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../brand-tokens/resolve";
import type { BrandTokens } from "../schema/brand";
import type { DocModel } from "../schema/docmodel";
import type { Slide, SlideLayout } from "../schema/containers";
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

interface SlideLayoutProps {
  deck: DeckModel;
  slide: Slide;
  slideNumber: number;
  slideCount: number;
  assetContext: AssetContext;
  diagramSvgs: Record<string, string>;
  chartSvgs: Record<string, string>;
}

type SlideLayoutComponent = FC<SlideLayoutProps>;

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

function SlideFrame({
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

function SlideBlocks({
  slide,
  assetContext,
  diagramSvgs,
  chartSvgs,
}: Pick<
  SlideLayoutProps,
  "slide" | "assetContext" | "diagramSvgs" | "chartSvgs"
>): ReactNode {
  return slide.blocks.map((block) => (
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

function CoverFallback({ deck }: { deck: DeckModel }): ReactNode {
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

function CoverLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame
      {...props}
      variant="cover"
      contentStyle={{ alignContent: "center", textAlign: "center" }}
    >
      {props.slide.blocks.length === 0 ? (
        <CoverFallback deck={props.deck} />
      ) : (
        <SlideBlocks {...props} />
      )}
    </SlideFrame>
  );
}

function SectionDividerLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame
      {...props}
      variant="section"
      contentStyle={{ alignContent: "center", textAlign: "center" }}
    >
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function AgendaLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame {...props} contentStyle={{ alignContent: "center" }}>
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function TitleBodyLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame {...props}>
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function TwoColumnLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame
      {...props}
      contentStyle={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
    >
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function ThreeColumnLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame
      {...props}
      contentStyle={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
    >
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function ChartFullLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame {...props} contentStyle={{ alignContent: "stretch" }}>
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function ChartCommentaryLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame
      {...props}
      contentStyle={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}
    >
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function TableLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame {...props} contentStyle={{ alignContent: "stretch" }}>
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function QuoteLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame
      {...props}
      contentStyle={{ alignContent: "center", justifyItems: "center" }}
    >
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function ProcessTimelineLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame {...props} contentStyle={{ alignContent: "center" }}>
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function TeamLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame {...props}>
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function KpisLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame {...props} contentStyle={{ alignContent: "center" }}>
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function ImageCaptionLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame
      {...props}
      contentStyle={{ gridTemplateRows: "minmax(0, 1fr) auto" }}
    >
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

function ClosingLayout(props: SlideLayoutProps): ReactNode {
  return (
    <SlideFrame {...props} contentStyle={{ alignContent: "center" }}>
      <SlideBlocks {...props} />
    </SlideFrame>
  );
}

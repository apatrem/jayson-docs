import type { CSSProperties, FC, ReactNode } from "react";
import { BrandProvider } from "../brand-tokens/BrandProvider";
import {
  type AssetContext,
} from "../brand-tokens/resolve-asset";
import { useBrandTokens } from "../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../brand-tokens/resolve";
import type { BrandTokens } from "../schema/brand";
import type { Block } from "../schema/blocks";
import type { DocModel } from "../schema/docmodel";
import type { Section } from "../schema/containers";
import { BulletList } from "../blocks/bullet-list";
import { Callout } from "../blocks/callout";
import { Chart } from "./blocks/Chart";
import { Diagram } from "../blocks/diagram";
import { Divider } from "../blocks/divider";
import { Heading } from "../blocks/heading";
import { Image } from "../blocks/image";
import { KpiCards } from "./blocks/KpiCards";
import { NumberedList } from "../blocks/numbered-list";
import { Prose } from "../blocks/prose";
import { RiskMatrix } from "./blocks/RiskMatrix";
import { Roadmap } from "./blocks/Roadmap";
import { Table } from "./blocks/Table";
import { Team } from "./blocks/Team";
import { Timeline } from "./blocks/Timeline";

export type DocumentModel = Extract<DocModel, { kind: "document" }>;

export interface DocumentRendererProps {
  doc: DocumentModel;
  brand: BrandTokens;
  sharedFolderPath?: string;
  docFolderPath?: string;
  /** Mermaid SVG strings keyed by diagram block id (PDF export). */
  diagramSvgs?: Record<string, string>;
  /** ECharts SVG strings keyed by chart block id (PDF export). */
  chartSvgs?: Record<string, string>;
  /** Inlined image data URIs keyed by image block id (PDF export). */
  imageDataUris?: Record<string, string>;
}

export const DocumentRenderer: FC<DocumentRendererProps> = ({
  doc,
  brand,
  sharedFolderPath = "/shared",
  docFolderPath = "/docs",
  diagramSvgs = {},
  chartSvgs = {},
  imageDataUris = {},
}) => {
  const assetContext: AssetContext = {
    sharedFolderPath,
    docFolderPath,
    brand,
  };

  return (
    <BrandProvider tokens={brand}>
      <DocumentBody
        doc={doc}
        assetContext={assetContext}
        diagramSvgs={diagramSvgs}
        chartSvgs={chartSvgs}
        imageDataUris={imageDataUris}
      />
    </BrandProvider>
  );
};

const DocumentBody: FC<{
  doc: DocumentModel;
  assetContext: AssetContext;
  diagramSvgs: Record<string, string>;
  chartSvgs: Record<string, string>;
  imageDataUris: Record<string, string>;
}> = ({ doc, assetContext, diagramSvgs, chartSvgs, imageDataUris }) => {
  const brand = useBrandTokens();
  const pageStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    backgroundColor: resolveBrandToken(brand, "colors.semantic.pageBackground"),
    margin: 0,
    padding: brand.spacing.unit * 4,
  };

  return (
    <article data-doc-kind="document" style={pageStyle}>
      {doc.sections.map((section) => (
        <DocumentSection
          key={section.id}
          section={section}
          assetContext={assetContext}
          diagramSvgs={diagramSvgs}
          chartSvgs={chartSvgs}
          imageDataUris={imageDataUris}
        />
      ))}
    </article>
  );
};

const DocumentSection: FC<{
  section: Section;
  assetContext: AssetContext;
  diagramSvgs: Record<string, string>;
  chartSvgs: Record<string, string>;
  imageDataUris: Record<string, string>;
}> = ({ section, assetContext, diagramSvgs, chartSvgs, imageDataUris }) => {
  const brand = useBrandTokens();

  return (
    <section
      data-section-id={section.id}
      style={{ marginBottom: brand.spacing.unit * 6 }}
    >
      {section.title ? (
        <h2
          style={{
            fontFamily: brand.typography.fonts.heading.family,
            fontSize: brand.typography.scale.h2,
            lineHeight: brand.typography.lineHeight.tight,
            color: resolveBrandToken(brand, "colors.semantic.headingPrimary"),
            margin: `0 0 ${brand.spacing.unit * 2}px 0`,
          }}
        >
          {section.title}
        </h2>
      ) : null}
      {section.blocks.map((block) => (
        <BlockView
          key={block.id}
          block={block}
          assetContext={assetContext}
          diagramSvgs={diagramSvgs}
          chartSvgs={chartSvgs}
          imageDataUris={imageDataUris}
        />
      ))}
    </section>
  );
};

export type BlockRenderContext = "document" | "deck";

export function BlockView({
  block,
  assetContext,
  diagramSvgs,
  chartSvgs,
  imageDataUris = {},
  dividerContext = "document",
}: {
  block: Block;
  assetContext: AssetContext;
  diagramSvgs: Record<string, string>;
  chartSvgs: Record<string, string>;
  imageDataUris?: Record<string, string>;
  dividerContext?: BlockRenderContext;
}): ReactNode {
  switch (block.type) {
    case "prose":
      return <Prose block={block} />;
    case "heading":
      return <Heading block={block} />;
    case "bullet-list":
      return <BulletList block={block} />;
    case "numbered-list":
      return <NumberedList block={block} />;
    case "callout":
      return <Callout block={block} />;
    case "kpi-cards":
      return <KpiCards block={block} />;
    case "image":
      return (
        <Image
          block={block}
          assetContext={assetContext}
          dataUri={imageDataUris[block.id]}
        />
      );
    case "table":
      return <Table block={block} />;
    case "chart": {
      const staticSvg = chartSvgs[block.id];
      return staticSvg !== undefined ? (
        <Chart block={block} staticSvg={staticSvg} />
      ) : (
        <Chart block={block} />
      );
    }
    case "timeline":
      return <Timeline block={block} />;
    case "roadmap":
      return <Roadmap block={block} />;
    case "risk-matrix":
      return <RiskMatrix block={block} />;
    case "team":
      return <Team block={block} assetContext={assetContext} />;
    case "diagram": {
      const renderedSvg = diagramSvgs[block.id];
      return renderedSvg !== undefined ? (
        <Diagram block={block} renderedSvg={renderedSvg} />
      ) : (
        <Diagram block={block} />
      );
    }
    case "divider":
      return <Divider block={block} context={dividerContext} />;
    default: {
      // Compile-time exhaustiveness check: if this errors, a new block type
      // was added to the union without a case above.
      const exhaustiveCheck: never = block;
      // Runtime diagnostic: if data coercion bypasses TS (e.g., the YAML
      // contained a block type that survived validation due to a schema
      // gap), throw with a precise message instead of silently rendering
      // `undefined` — silent rendering hides regressions for a long time.
      throw new Error(
        `BlockView: unhandled block type "${String((exhaustiveCheck as unknown as { type?: string }).type)}". ` +
          `Add a case to BlockView's switch in src/renderer/DocumentRenderer.tsx, ` +
          `then register the block in src/schema/blocks/index.ts.`,
      );
    }
  }
}

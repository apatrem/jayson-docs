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
import { BulletList } from "./blocks/BulletList";
import { Callout } from "./blocks/Callout";
import { Chart } from "./blocks/Chart";
import { Diagram } from "./blocks/Diagram";
import { Divider } from "./blocks/Divider";
import { Heading } from "./blocks/Heading";
import { Image } from "./blocks/Image";
import { KpiCards } from "./blocks/KpiCards";
import { NumberedList } from "./blocks/NumberedList";
import { Prose } from "./blocks/Prose";
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
}

export const DocumentRenderer: FC<DocumentRendererProps> = ({
  doc,
  brand,
  sharedFolderPath = "/shared",
  docFolderPath = "/docs",
}) => {
  const assetContext: AssetContext = {
    sharedFolderPath,
    docFolderPath,
    brand,
  };

  return (
    <BrandProvider tokens={brand}>
      <DocumentBody doc={doc} assetContext={assetContext} />
    </BrandProvider>
  );
};

const DocumentBody: FC<{
  doc: DocumentModel;
  assetContext: AssetContext;
}> = ({ doc, assetContext }) => {
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
        />
      ))}
    </article>
  );
};

const DocumentSection: FC<{
  section: Section;
  assetContext: AssetContext;
}> = ({ section, assetContext }) => {
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
        />
      ))}
    </section>
  );
};

function BlockView({
  block,
  assetContext,
}: {
  block: Block;
  assetContext: AssetContext;
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
      return <Image block={block} assetContext={assetContext} />;
    case "table":
      return <Table block={block} />;
    case "chart":
      return <Chart block={block} />;
    case "timeline":
      return <Timeline block={block} />;
    case "roadmap":
      return <Roadmap block={block} />;
    case "risk-matrix":
      return <RiskMatrix block={block} />;
    case "team":
      return <Team block={block} assetContext={assetContext} />;
    case "diagram":
      return <Diagram block={block} />;
    case "divider":
      return <Divider block={block} />;
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

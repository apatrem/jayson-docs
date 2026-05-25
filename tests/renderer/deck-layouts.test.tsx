import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DeckRenderer } from "../../src/renderer/DeckRenderer";
import { AgendaLayout } from "../../src/renderer/layouts/Agenda";
import { ChartCommentaryLayout } from "../../src/renderer/layouts/ChartCommentary";
import { ChartFullLayout } from "../../src/renderer/layouts/ChartFull";
import { ClosingLayout } from "../../src/renderer/layouts/Closing";
import { CoverLayout } from "../../src/renderer/layouts/Cover";
import { ImageCaptionLayout } from "../../src/renderer/layouts/ImageCaption";
import { KpisLayout } from "../../src/renderer/layouts/Kpis";
import { ProcessTimelineLayout } from "../../src/renderer/layouts/ProcessTimeline";
import { QuoteLayout } from "../../src/renderer/layouts/Quote";
import { SectionDividerLayout } from "../../src/renderer/layouts/SectionDivider";
import { TableLayout } from "../../src/renderer/layouts/Table";
import { TeamLayout } from "../../src/renderer/layouts/Team";
import { ThreeColumnLayout } from "../../src/renderer/layouts/ThreeColumn";
import { TitleBodyLayout } from "../../src/renderer/layouts/TitleBody";
import { TwoColumnLayout } from "../../src/renderer/layouts/TwoColumn";
import type { BrandTokens } from "../../src/schema/brand";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { DocModel } from "../../src/schema/docmodel";
import { SlideLayoutSchema, type SlideLayout } from "../../src/schema/containers";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const brand: BrandTokens = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const layoutComponents = {
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
} satisfies Record<SlideLayout, unknown>;

function deckWithAllLayouts(): Extract<DocModel, { kind: "deck" }> {
  return {
    kind: "deck",
    schemaVersion: "1.0.0",
    meta: {
      client: "Acme Industrial",
      project: "Layout smoke deck",
      docKind: "deck",
      tags: [],
      language: "en",
      status: "draft",
      archived: false,
      confidentialityLevel: "medium",
      owner: "owner@example.com",
      reviewers: [],
      createdAt: "2026-05-25T00:00:00Z",
      updatedAt: "2026-05-25T00:00:00Z",
      brandRef: "$brand:default",
    },
    slides: SlideLayoutSchema.options.map((layout) => ({
      id: `slide-${layout}`,
      layout,
      blocks: [
        {
          id: `block-${layout}`,
          type: "heading",
          level: 1,
          text: `${layout} title`,
          numbered: false,
        },
      ],
    })),
    comments: [],
  };
}

describe("deck slide layouts", () => {
  it("exports one component for every closed slide layout", () => {
    expect(Object.keys(layoutComponents).sort()).toEqual(
      [...SlideLayoutSchema.options].sort(),
    );
  });

  it("renders every slide through its layout while preserving block content", () => {
    const html = renderToStaticMarkup(
      createElement(DeckRenderer, { deck: deckWithAllLayouts(), brand }),
    );

    for (const layout of SlideLayoutSchema.options) {
      expect(html).toContain(`data-slide-layout="${layout}"`);
      expect(html).toContain(`block-${layout}`);
      expect(html).toContain(`${layout} title`);
    }
  });
});

import * as echarts from "echarts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getEChartsOption } from "../renderer/blocks/Chart";
import {
  DocumentRenderer,
  type DocumentModel,
} from "../renderer/DocumentRenderer";
import { renderMermaidSvg } from "../renderer/mermaid";
import type { BrandTokens } from "../schema/brand";
import type { Block } from "../schema/blocks";

const PAGE_BREAK_CSS = `
@media print {
  [data-block-type="heading"] {
    break-after: avoid;
    page-break-after: avoid;
  }

  [data-block-type="chart"],
  [data-block-type="table"],
  [data-block-type="kpi-cards"],
  [data-block-type="diagram"],
  [data-block-type="callout"],
  [data-block-type="image"],
  [data-block-type="timeline"],
  [data-block-type="roadmap"],
  [data-block-type="risk-matrix"],
  [data-block-type="team"],
  .doc-keep-together {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  [data-block-type="table"] tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .doc-page-break,
  [data-block-type="divider"][data-render-context="document"] {
    break-before: page;
    page-break-before: always;
  }
}
`;

export async function renderStaticHtmlForExport(
  doc: DocumentModel,
  brand: BrandTokens,
): Promise<string> {
  const diagramSvgs = await preRenderDiagramSvgs(doc, brand);
  const chartSvgs = preRenderChartSvgs(doc, brand);
  const body = renderToStaticMarkup(
    createElement(DocumentRenderer, {
      doc,
      brand,
      diagramSvgs,
      chartSvgs,
    }),
  );

  return `<!doctype html>
<html lang="${escapeHtml(doc.meta.language ?? "en")}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(doc.meta.project)}</title>
    <style>
      * { box-sizing: border-box; }
      @page { size: A4 portrait; margin: 1.5cm; }
      body { margin: 0; }
      ${PAGE_BREAK_CSS}
    </style>
  </head>
  <body>${body}</body>
</html>`;
}

async function preRenderDiagramSvgs(
  doc: DocumentModel,
  brand: BrandTokens,
): Promise<Record<string, string>> {
  const svgs: Record<string, string> = {};
  for (const block of blocksInDocument(doc)) {
    if (block.type === "diagram") {
      svgs[block.id] = await renderMermaidSvg(block.source, brand);
    }
  }
  return svgs;
}

function preRenderChartSvgs(
  doc: DocumentModel,
  brand: BrandTokens,
): Record<string, string> {
  const svgs: Record<string, string> = {};
  for (const block of blocksInDocument(doc)) {
    if (block.type !== "chart") continue;
    const instance = echarts.init(null, null, {
      renderer: "svg",
      ssr: true,
      width: 800,
      height: 360,
    });
    instance.setOption(getEChartsOption(block, brand), true);
    svgs[block.id] = instance.renderToSVGString();
    instance.dispose();
  }
  return svgs;
}

function blocksInDocument(doc: DocumentModel): Block[] {
  return doc.sections.flatMap((section) => section.blocks);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

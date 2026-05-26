import { invoke } from "@tauri-apps/api/core";
import * as echarts from "echarts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveAssetPath } from "../brand-tokens/resolve-asset";
import { getEChartsOption } from "../renderer/blocks/Chart";
import {
  DocumentRenderer,
  type DocumentModel,
} from "../renderer/DocumentRenderer";
import { renderMermaidSvg } from "../renderer/mermaid";
import type { BrandTokens } from "../schema/brand";
import type { Block } from "../schema/blocks";

const TOTAL_IMAGE_PAYLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

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
  docFolderPath = "/docs",
  sharedFolderPath = "/shared",
): Promise<string> {
  const diagramSvgs = await preRenderDiagramSvgs(doc, brand);
  const chartSvgs = preRenderChartSvgs(doc, brand);
  const imageDataUris = await preloadImageDataUris(
    doc,
    brand,
    docFolderPath,
    sharedFolderPath,
  );
  const body = renderToStaticMarkup(
    createElement(DocumentRenderer, {
      doc,
      brand,
      docFolderPath,
      sharedFolderPath,
      diagramSvgs,
      chartSvgs,
      imageDataUris,
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

async function preloadImageDataUris(
  doc: DocumentModel,
  brand: BrandTokens,
  docFolderPath: string,
  sharedFolderPath: string,
): Promise<Record<string, string>> {
  const dataUris: Record<string, string> = {};
  let totalBytes = 0;

  for (const block of blocksInDocument(doc)) {
    if (block.type !== "image") continue;
    const path = resolveAssetPath(
      {
        brand,
        docFolderPath,
        sharedFolderPath,
      },
      block.src,
    );
    const mimeType = mimeTypeForPath(path);

    try {
      const bytes = await readBinaryFile(path);
      totalBytes += bytes.length;
      if (totalBytes > TOTAL_IMAGE_PAYLOAD_LIMIT_BYTES) {
        dataUris[block.id] = imagePlaceholderDataUri("Image too large to export");
        console.warn("image export payload exceeded 50MB total cap");
        continue;
      }
      dataUris[block.id] = `data:${mimeType};base64,${bytesToBase64(bytes)}`;
    } catch (error) {
      if (String(error).includes("file exceeds 5MB export limit")) {
        dataUris[block.id] = imagePlaceholderDataUri("Image too large to export");
        continue;
      }
      throw error;
    }
  }

  return dataUris;
}

async function readBinaryFile(path: string): Promise<ArrayLike<number>> {
  return invoke<ArrayLike<number>>("read_binary_file", { path });
}

function mimeTypeForPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "svg":
      // SVG is safe here only because export consumes it via <img src=data:>.
      return "image/svg+xml";
    case "webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function bytesToBase64(bytes: ArrayLike<number>): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(binary, "binary").toString("base64");
}

function imagePlaceholderDataUri(message: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="120"><rect width="100%" height="100%" fill="#f8fafc"/><text x="24" y="68" fill="#475569" font-family="Arial, sans-serif" font-size="20">${escapeHtml(message)}</text></svg>`;
  return `data:image/svg+xml;base64,${bytesToBase64(Array.from(svg, (char) => char.charCodeAt(0)))}`;
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

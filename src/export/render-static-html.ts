import { invoke } from "@tauri-apps/api/core";
import * as echarts from "echarts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveAssetPath } from "../brand-tokens/resolve-asset";
import { isIpcError } from "../ipc/errors";
import { getEChartsOption } from "../renderer/blocks/Chart";
import { DocumentRenderer, type DocumentModel } from "../renderer/DocumentRenderer";
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
  const imageDataUris = await preloadImageDataUris(doc, brand, docFolderPath, sharedFolderPath);
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
      const encoded = await readBinaryFile(path);
      totalBytes += base64DecodedByteLength(encoded);
      if (totalBytes > TOTAL_IMAGE_PAYLOAD_LIMIT_BYTES) {
        dataUris[block.id] = imagePlaceholderDataUri("Image too large to export");
        console.warn("image export payload exceeded 50MB total cap");
        continue;
      }
      const safeEncoded = mimeType === "image/svg+xml" ? svgBase64ToSafeBase64(encoded) : encoded;
      dataUris[block.id] = `data:${mimeType};base64,${safeEncoded}`;
    } catch (error) {
      // Tauri invoke() rejects with the raw IpcError JSON object, not an
      // Error instance, so `String(error)` gives "[object Object]". Match
      // against the typed shape via the canonical helper. See
      // AGENTS.md §Review playbook convention #8.
      if (
        isIpcError(error) &&
        error.message.includes("file exceeds 5MB export limit")
      ) {
        dataUris[block.id] = imagePlaceholderDataUri("Image too large to export");
        continue;
      }
      throw error;
    }
  }

  return dataUris;
}

async function readBinaryFile(path: string): Promise<string> {
  return invoke<string>("read_binary_file", { path });
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

function svgBase64ToSafeBase64(encoded: string): string {
  const svg = decodeBase64ToUtf8(encoded);
  return utf8ToBase64(sanitizeSvgForImage(svg));
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeBase64ToUtf8(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64DecodedByteLength(encoded: string): number {
  const normalized = encoded.replace(/\s/gu, "");
  if (normalized.length === 0) return 0;
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

function sanitizeSvgForImage(svg: string): string {
  return svg
    .replace(/<script\b[\s\S]*?<\/script>/giu, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "");
}

function imagePlaceholderDataUri(message: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="120"><rect width="100%" height="100%" fill="#f8fafc"/><text x="24" y="68" fill="#475569" font-family="Arial, sans-serif" font-size="20">${escapeHtml(message)}</text></svg>`;
  return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
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

function preRenderChartSvgs(doc: DocumentModel, brand: BrandTokens): Record<string, string> {
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

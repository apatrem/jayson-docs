import { invoke } from "@tauri-apps/api/core";
import * as echarts from "echarts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveAssetPath } from "../brand-tokens/resolve-asset";
import { isIpcError } from "../ipc/errors";
import { getEChartsOption } from "../blocks/chart";
import { DocumentRenderer, type DocumentModel } from "../renderer/DocumentRenderer";
import { buildPageCss } from "../renderer/page-css";
import { renderMermaidSvg } from "../renderer/mermaid";
import type { BrandTokens } from "../schema/brand";
import type { Block } from "../schema/blocks";

const TOTAL_IMAGE_PAYLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

// Matches the per-file size-cap rejection emitted by `read_binary_file` in
// `src-tauri/src/ipc/fs.rs:51` ("file exceeds 5MB export limit"). The Rust
// side emits this message as `IpcError::Invalid`; we gate on `kind ===
// "invalid"` first so unrelated `Invalid` errors with similar wording can't
// silently coerce into placeholders. Keep this regex in sync with the Rust
// wording — both halves of the contract live in one place per change.
const SIZE_CAP_MESSAGE_PATTERN = /exceeds\s+5MB\s+export\s+limit/iu;


/**
 * Renders the document body to a static HTML string with all assets pre-rendered
 * (chart/diagram SVGs, inlined image data URIs) so it is safe to serialize
 * without a live DOM — i.e. no client-only ECharts/Mermaid render during SSR.
 * Shared by the PDF export and the in-app paged.js Page view so both show the
 * same output.
 */
export async function renderExportBody(
  doc: DocumentModel,
  brand: BrandTokens,
  docFolderPath = "/docs",
  sharedFolderPath = "/shared",
): Promise<string> {
  const diagramSvgs = await preRenderDiagramSvgs(doc, brand);
  const chartSvgs = preRenderChartSvgs(doc, brand);
  const imageDataUris = await preloadImageDataUris(doc, brand, docFolderPath, sharedFolderPath);
  const rendered = renderToStaticMarkup(
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
  // The brand logo for the @page footer-left margin box (paged.js running
  // element). Lifted out of flow by `.doc-running-footer-logo` in buildPageCss.
  const footerLogo = await loadFooterLogoMarkup(brand, sharedFolderPath);
  return `<div class="doc-running-footer-logo">${footerLogo}</div>${rendered}`;
}

/**
 * Markup for the footer brand logo. Loads the real `$brand:logo.primary` SVG via
 * the same binary-read IPC used for image blocks (sanitized, embedded as an
 * <img> data URI). Falls back to a brand-token badge when the asset can't be
 * read or isn't an SVG (dev stub, tests, or a missing file) so the footer
 * always shows a logo.
 */
async function loadFooterLogoMarkup(
  brand: BrandTokens,
  sharedFolderPath: string,
): Promise<string> {
  try {
    const path = resolveAssetPath(
      { brand, docFolderPath: sharedFolderPath, sharedFolderPath },
      "$brand:logo.primary",
    );
    const encoded = await readBinaryFile(path);
    if (decodeBase64ToUtf8(encoded).includes("<svg")) {
      const safe = svgBase64ToSafeBase64(encoded);
      return `<img src="data:image/svg+xml;base64,${safe}" alt="" />`;
    }
  } catch {
    // Fall through to the brand-token badge below.
  }
  const short = brand.identity.shortName ?? brand.identity.name.slice(0, 3);
  const color = brand.colors.brand.primary;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 40" role="img" aria-label="${escapeHtml(
    brand.identity.name,
  )}"><rect width="128" height="40" rx="4" fill="${color}"/><text x="64" y="26" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="14" font-weight="700">${escapeHtml(
    short,
  )}</text></svg>`;
}

export async function renderStaticHtmlForExport(
  doc: DocumentModel,
  brand: BrandTokens,
  docFolderPath = "/docs",
  sharedFolderPath = "/shared",
): Promise<string> {
  const body = await renderExportBody(doc, brand, docFolderPath, sharedFolderPath);
  // Inline the vendored paged.js polyfill so the standalone export HTML
  // paginates itself in the browser and renders our own @page header (title) +
  // page-number footer — Chrome's native print engine ignores @page margin
  // boxes, so this is what lets the printed PDF drop the date and file path
  // (with Chrome's "Headers and footers" turned off). See ADR-0017.
  const { default: pagedPolyfill } = await import("../vendor/paged.polyfill.min.js?raw");
  // Defensive: a literal "</script>" inside the inlined bundle would terminate
  // our <script> early; neutralize it (current bundle has none).
  const safePolyfill = pagedPolyfill.replace(/<\/(script)/giu, "<\\/$1");
  return `<!doctype html>
<html lang="${escapeHtml(doc.meta.language ?? "en")}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(doc.meta.project)}</title>
    <style>${buildPageCss(brand, { title: doc.meta.project })}</style>
  </head>
  <body>${body}<script>${safePolyfill}</script></body>
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
        error.kind === "invalid" &&
        SIZE_CAP_MESSAGE_PATTERN.test(error.message)
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

// Allowlist-by-removal SVG sanitizer. Strips active content vectors so the
// resulting SVG is safe to embed via `<img src="data:image/svg+xml,...">`.
//
// SAFE ONLY for `<img src=data:>` embedding. Browsers script-disable scripts
// inside `<img>`-loaded SVGs. RE-AUDIT before consuming the output via
// `<object>`, `<iframe>`, or inline `<svg>` — those execution contexts run
// `<script>`, event handlers, SMIL animations, and CSS `expression()`.
// See `docs/UI_APP_SHELL.md` §"SVG sanitization contract".
function sanitizeSvgForImage(svg: string): string {
  return (
    svg
      // <script>...</script> blocks (DOM execution vector).
      .replace(/<script\b[\s\S]*?<\/script>/giu, "")
      // <style>...</style> blocks (CSS `expression()` + `url(javascript:)`).
      .replace(/<style\b[\s\S]*?<\/style>/giu, "")
      // <foreignObject>...</foreignObject> blocks (HTML inside SVG; runs
      // arbitrary markup if SVG is ever rendered inline).
      .replace(/<foreignObject\b[\s\S]*?<\/foreignObject>/giu, "")
      // <animate>, <animateMotion>, <animateTransform>, <set> elements —
      // SMIL animations can `attributeName="href"` toward `javascript:` URLs
      // even after static sanitization of the initial href.
      .replace(/<animate\b[\s\S]*?(?:\/>|<\/animate>)/giu, "")
      .replace(/<animateMotion\b[\s\S]*?(?:\/>|<\/animateMotion>)/giu, "")
      .replace(/<animateTransform\b[\s\S]*?(?:\/>|<\/animateTransform>)/giu, "")
      .replace(/<set\b[\s\S]*?(?:\/>|<\/set>)/giu, "")
      // Strip any `href` or `xlink:href` attribute whose value is a
      // `javascript:` URL. Applies to <a>, <use>, <image>, and any custom
      // SVG element. Allowing http(s) hrefs would still be inert under
      // <img src=data:> but we're defense-in-depth here.
      .replace(
        /\s+(?:xlink:)?href\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/giu,
        "",
      )
      // Any `on*=` event-handler attribute (the canonical DOM execution
      // vector). Kept last so the script/style/animate strippers above can
      // match their tags before we mutate attribute spacing.
      .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/giu, "")
  );
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

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { parse } from "yaml";
import { DeckRenderer, type DeckModel } from "../renderer/DeckRenderer";
import { DocumentRenderer, type DocumentModel } from "../renderer/DocumentRenderer";
import type { BrandTokens } from "../schema/brand";
import { BrandTokensSchema } from "../schema/brand";
import * as echarts from "echarts";
import { getEChartsOption } from "../blocks/chart";
import { renderMermaidSvg } from "../renderer/mermaid";
import type { Block } from "../schema/blocks";
import { validateDocModel } from "../schema/validate";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pageBreakCss = readFileSync(join(repoRoot, "src/renderer/page-breaks.css"), "utf8");

export interface PdfExportOptions {
  brandPath?: string;
  sharedFolderPath?: string;
  docFolderPath?: string;
}

export interface PdfExportInput {
  docYamlPath: string;
  outputPdfPath: string;
  options?: PdfExportOptions;
}

export type PdfModel = DocumentModel | DeckModel;

function mm(value: number): string {
  return `${value}mm`;
}

export function loadBrandTokens(brandPath: string): BrandTokens {
  const raw: unknown = parse(readFileSync(brandPath, "utf8"));
  return BrandTokensSchema.parse(raw);
}

export function loadDocumentModel(yamlPath: string): PdfModel {
  const raw: unknown = parse(readFileSync(yamlPath, "utf8"));
  const result = validateDocModel(raw);
  if (!result.ok) {
    throw new Error(
      `invalid DocModel: ${result.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`,
    );
  }
  return result.doc;
}

function blocksInModel(doc: PdfModel): Block[] {
  return doc.kind === "document"
    ? doc.sections.flatMap((section) => section.blocks)
    : doc.slides.flatMap((slide) => slide.blocks);
}

export async function preRenderDiagramSvgs(
  doc: PdfModel,
  brand: BrandTokens,
): Promise<Record<string, string>> {
  const svgs: Record<string, string> = {};
  for (const block of blocksInModel(doc)) {
    if (block.type === "diagram") {
      svgs[block.id] = await renderMermaidSvg(block.source, brand);
    }
  }
  return svgs;
}

export function preRenderChartSvgs(doc: PdfModel, brand: BrandTokens): Record<string, string> {
  const svgs: Record<string, string> = {};
  for (const block of blocksInModel(doc)) {
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

export async function renderDocumentHtml(
  doc: PdfModel,
  brand: BrandTokens,
  paths?: { sharedFolderPath?: string; docFolderPath?: string },
): Promise<string> {
  const sharedFolderPath = paths?.sharedFolderPath ?? repoRoot;
  const docFolderPath = paths?.docFolderPath ?? repoRoot;
  const diagramSvgs = await preRenderDiagramSvgs(doc, brand);
  const chartSvgs = preRenderChartSvgs(doc, brand);

  const body = renderToStaticMarkup(
    doc.kind === "document"
      ? createElement(DocumentRenderer, {
          doc,
          brand,
          sharedFolderPath,
          docFolderPath,
          diagramSvgs,
          chartSvgs,
        })
      : createElement(DeckRenderer, {
          deck: doc,
          brand,
          sharedFolderPath,
          docFolderPath,
          diagramSvgs,
          chartSvgs,
        }),
  );
  const deckPageCss =
    doc.kind === "deck"
      ? `@page { size: ${brand.deck.dimensionsPx.width}px ${brand.deck.dimensionsPx.height}px; margin: 0; }`
      : "";

  return `<!DOCTYPE html>
<html lang="${doc.meta.language ?? "en"}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(doc.meta.project)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; }
      ${deckPageCss}
    </style>
    <style>${pageBreakCss}</style>
  </head>
  <body>${body}</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPdfOptions(
  brand: BrandTokens,
  templates: { headerTemplate: string; footerTemplate: string },
  kind: PdfModel["kind"] = "document",
) {
  if (kind === "deck") {
    // Deck page geometry is driven entirely by the `@page { size: <w>px <h>px }`
    // declaration injected into the HTML head by renderDocumentHtml. With
    // preferCSSPageSize: true, Playwright honours that CSS and IGNORES the
    // width/height/format options — passing both would be dead config and
    // make it ambiguous which side owns page size. Leave the size to CSS.
    return {
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
    } as const;
  }

  const { page } = brand;
  return {
    format: page.size,
    landscape: page.orientation === "landscape",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: templates.headerTemplate,
    footerTemplate: templates.footerTemplate,
    margin: {
      top: mm(page.margins.top),
      right: mm(page.margins.right),
      bottom: mm(page.margins.bottom),
      left: mm(page.margins.left),
    },
  } as const;
}

function logoDataUri(brand: BrandTokens, sharedFolderPath: string): string {
  const relative = brand.logo.primary.svg;
  const absolute = join(sharedFolderPath, relative);
  if (existsSync(absolute)) {
    const svg = readFileSync(absolute, "utf8");
    return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
  }
  const short = brand.identity.shortName ?? brand.identity.name.slice(0, 3);
  const fallback = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 24"><rect width="80" height="24" fill="${brand.colors.brand.primary}"/><text x="40" y="16" text-anchor="middle" fill="#fff" font-size="10" font-family="Arial">${escapeHtml(short)}</text></svg>`;
  return `data:image/svg+xml;base64,${utf8ToBase64(fallback)}`;
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function buildHeaderTemplate(
  doc: PdfModel,
  brand: BrandTokens,
  sharedFolderPath: string,
): string {
  const header = brand.page.header;
  if (!header?.enabled) {
    return "<span></span>";
  }

  const logoSrc = logoDataUri(brand, sharedFolderPath);
  const title = escapeHtml(doc.meta.project);
  const heightMm = header.heightMm ?? 12;

  return `<div style="width:100%;font-size:9px;padding:0 8mm;box-sizing:border-box;">
  <div style="display:flex;align-items:center;justify-content:space-between;height:${heightMm}mm;">
    <img src="${logoSrc}" style="height:${Math.max(6, heightMm - 4)}mm;width:auto;" alt="" />
    <span style="font-family:Arial,sans-serif;color:${brand.colors.brand.dark};font-size:10px;font-weight:600;">${title}</span>
  </div>
</div>`;
}

export function buildFooterTemplate(doc: PdfModel, brand: BrandTokens): string {
  const footer = brand.page.footer;
  if (!footer?.enabled) {
    return "<span></span>";
  }

  const notice =
    brand.identity.confidentialityNotice?.trim() ??
    `${doc.meta.confidentialityLevel} — ${brand.identity.name}`;
  const format = footer.pageNumberFormat ?? "Page {n} of {total}";
  const pageLabel = format
    .replace("{n}", '<span class="pageNumber"></span>')
    .replace("{total}", '<span class="totalPages"></span>');
  const heightMm = footer.heightMm ?? 10;

  return `<div style="width:100%;font-size:8px;padding:0 8mm;box-sizing:border-box;color:${brand.colors.neutral["600"] ?? "#4B5563"};">
  <div style="display:flex;align-items:center;justify-content:space-between;height:${heightMm}mm;">
    <span style="font-family:Arial,sans-serif;max-width:70%;">${escapeHtml(notice)}</span>
    <span style="font-family:Arial,sans-serif;white-space:nowrap;">${pageLabel}</span>
  </div>
</div>`;
}

export async function exportHtmlToPdf(
  html: string,
  outputPdfPath: string,
  brand: BrandTokens,
  templates: { headerTemplate: string; footerTemplate: string },
  kind: PdfModel["kind"] = "document",
): Promise<void> {
  // Playwright 1.47 defaults Chromium 129 to old headless, which can SIGABRT
  // during AppKit startup on macOS 26 before any document code runs.
  const browser = await chromium.launch({
    headless: true,
    args: ["--headless=new", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage();
    // `waitUntil: "load"` assumes the HTML is fully self-contained:
    // SSR'd markup, inline CSS, no remote fonts or async assets. The
    // DocumentRenderer pipeline (renderDocumentHtml + pre-rendered SVGs
    // for diagrams and charts) satisfies this today. If a future scaffold
    // introduces remote font loads or dynamic imports inside generated
    // blocks, switch to `"networkidle"` to wait for the loading to settle.
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: outputPdfPath,
      ...buildPdfOptions(brand, templates, kind),
    });
  } finally {
    await browser.close();
  }
}

export async function exportPdfFromDocument(
  doc: PdfModel,
  outputPdfPath: string,
  brand: BrandTokens,
  paths?: { sharedFolderPath?: string; docFolderPath?: string },
): Promise<void> {
  const sharedFolderPath = paths?.sharedFolderPath ?? repoRoot;
  const html = await renderDocumentHtml(doc, brand, paths);
  const templates = {
    headerTemplate: buildHeaderTemplate(doc, brand, sharedFolderPath),
    footerTemplate: buildFooterTemplate(doc, brand),
  };
  await exportHtmlToPdf(html, outputPdfPath, brand, templates, doc.kind);
}

export async function exportPdfFromYaml(input: PdfExportInput): Promise<void> {
  const brandPath = resolve(input.options?.brandPath ?? join(repoRoot, "brand.example.yaml"));
  const docYamlPath = resolve(input.docYamlPath);
  const outputPdfPath = resolve(input.outputPdfPath);
  const brand = loadBrandTokens(brandPath);
  const doc = loadDocumentModel(docYamlPath);

  const docAssetRoot = dirname(docYamlPath);
  await exportPdfFromDocument(doc, outputPdfPath, brand, {
    sharedFolderPath: input.options?.sharedFolderPath ?? dirname(brandPath),
    docFolderPath: input.options?.docFolderPath ?? docAssetRoot,
  });
}

function parseCliArgs(argv: string[]): PdfExportInput {
  const positional = argv.filter((a) => !a.startsWith("-"));
  let brandPath: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--brand" && argv[i + 1]) {
      brandPath = argv[++i];
    }
  }
  if (positional.length < 2) {
    throw new Error("usage: export:pdf -- <input.yaml> <output.pdf> [--brand <brand.yaml>]");
  }
  const input: PdfExportInput = {
    docYamlPath: positional[0] ?? "",
    outputPdfPath: positional[1] ?? "",
  };
  if (brandPath) {
    input.options = { brandPath };
  }
  return input;
}

async function main(): Promise<void> {
  const input = parseCliArgs(process.argv.slice(2));
  await exportPdfFromYaml(input);
  process.stdout.write(`Wrote ${resolve(input.outputPdfPath)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";

if (import.meta.url === invokedPath) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`export:pdf failed: ${message}\n`);
    process.exit(1);
  });
}

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { parse } from "yaml";
import { DocumentRenderer, type DocumentModel } from "../renderer/DocumentRenderer";
import type { BrandTokens } from "../schema/brand";
import { BrandTokensSchema } from "../schema/brand";
import { validateDocModel } from "../schema/validate";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

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

function mm(value: number): string {
  return `${value}mm`;
}

export function loadBrandTokens(brandPath: string): BrandTokens {
  const raw: unknown = parse(readFileSync(brandPath, "utf8"));
  const base = BrandTokensSchema.parse(raw);
  return {
    ...base,
    headshots: {
      "jane-smith": "assets/headshots/jane-smith.svg",
      "pierre-dubois": "assets/headshots/pierre-dubois.svg",
      "marie-chen": "assets/headshots/marie-chen.svg",
    },
  } as BrandTokens;
}

export function loadDocumentModel(yamlPath: string): DocumentModel {
  const raw: unknown = parse(readFileSync(yamlPath, "utf8"));
  const result = validateDocModel(raw);
  if (!result.ok) {
    throw new Error(
      `invalid DocModel: ${result.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`,
    );
  }
  if (result.doc.kind !== "document") {
    throw new Error(`PDF export requires kind: document (got ${result.doc.kind})`);
  }
  return result.doc;
}

export function renderDocumentHtml(
  doc: DocumentModel,
  brand: BrandTokens,
  paths?: { sharedFolderPath?: string; docFolderPath?: string },
): string {
  const sharedFolderPath = paths?.sharedFolderPath ?? repoRoot;
  const docFolderPath = paths?.docFolderPath ?? repoRoot;

  const body = renderToStaticMarkup(
    createElement(DocumentRenderer, {
      doc,
      brand,
      sharedFolderPath,
      docFolderPath,
    }),
  );

  return `<!DOCTYPE html>
<html lang="${doc.meta.language ?? "en"}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(doc.meta.project)}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; }
    </style>
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

function pdfOptionsFromBrand(brand: BrandTokens) {
  const { page } = brand;
  return {
    format: page.size,
    landscape: page.orientation === "landscape",
    printBackground: true,
    margin: {
      top: mm(page.margins.top),
      right: mm(page.margins.right),
      bottom: mm(page.margins.bottom),
      left: mm(page.margins.left),
    },
  } as const;
}

export async function exportHtmlToPdf(
  html: string,
  outputPdfPath: string,
  brand: BrandTokens,
): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: outputPdfPath,
      ...pdfOptionsFromBrand(brand),
    });
  } finally {
    await browser.close();
  }
}

export async function exportPdfFromDocument(
  doc: DocumentModel,
  outputPdfPath: string,
  brand: BrandTokens,
  paths?: { sharedFolderPath?: string; docFolderPath?: string },
): Promise<void> {
  const html = renderDocumentHtml(doc, brand, paths);
  await exportHtmlToPdf(html, outputPdfPath, brand);
}

export async function exportPdfFromYaml(
  input: PdfExportInput,
): Promise<void> {
  const brandPath = input.options?.brandPath ?? join(repoRoot, "brand.example.yaml");
  const docYamlPath = resolve(input.docYamlPath);
  const outputPdfPath = resolve(input.outputPdfPath);
  const brand = loadBrandTokens(brandPath);
  const doc = loadDocumentModel(docYamlPath);

  const assetRoot = dirname(docYamlPath);
  await exportPdfFromDocument(doc, outputPdfPath, brand, {
    sharedFolderPath: input.options?.sharedFolderPath ?? assetRoot,
    docFolderPath: input.options?.docFolderPath ?? assetRoot,
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
    throw new Error(
      "usage: export:pdf -- <input.yaml> <output.pdf> [--brand <brand.yaml>]",
    );
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

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : "";

if (import.meta.url === invokedPath) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`export:pdf failed: ${message}\n`);
    process.exit(1);
  });
}

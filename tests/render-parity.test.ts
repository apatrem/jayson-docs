import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  exportPdfFromDocument,
  loadBrandTokens,
  loadDocumentModel,
  renderDocumentHtml,
} from "../src/export/pdf";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const proposalPath = join(repoRoot, "examples/sample-proposal.yaml");

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function pdfToText(pdfPath: string): Promise<string> {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await getDocument({ data, useSystemFonts: true }).promise;
  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(pageText);
  }
  return parts.join(" ");
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").toLowerCase();
}

const parityAnchors = [
  "Executive summary",
  "Acme Industrial",
  "€42M",
  "-72%",
  "12 wk",
  "Projected annual OPEX by scenario",
  "Phase",
  "Duration",
  "Team weeks",
  "Honoraires",
  "Jane Smith",
  "Pierre Dubois",
];

describe("HTML vs PDF render parity (T-58)", () => {
  it(
    "sample-proposal.yaml text appears in exported PDF",
    async () => {
      const brand = loadBrandTokens(join(repoRoot, "brand.example.yaml"));
      const doc = loadDocumentModel(proposalPath);
      const paths = {
        sharedFolderPath: repoRoot,
        docFolderPath: join(repoRoot, "examples"),
      };

      const html = await renderDocumentHtml(doc, brand, paths);
      const htmlText = normalizeText(htmlToText(html));

      const tmpDir = mkdtempSync(join(tmpdir(), "parity-"));
      const pdfPath = join(tmpDir, "proposal.pdf");
      try {
        await exportPdfFromDocument(doc, pdfPath, brand, paths);
        const pdfText = normalizeText(await pdfToText(pdfPath));

        for (const anchor of parityAnchors) {
          const needle = normalizeText(anchor);
          expect(htmlText, `HTML should contain "${anchor}"`).toContain(needle);
          expect(pdfText, `PDF should contain "${anchor}"`).toContain(needle);
        }
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});

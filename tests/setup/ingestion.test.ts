import { mkdtempSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import pptxgen from "pptxgenjs";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  analyzeDemoDirectory,
  analyzeDemoFile,
  writeDemoAnalysis,
} from "../../src/setup/ingestion/analyze";
import { DEMO_ANALYSIS_SCHEMA_VERSION } from "../../src/setup/ingestion/types";

// Generated samples land in a temp dir so test runs never mutate the tracked
// fixtures under tests/fixtures/setup-demos/ (those are read-only goldens
// consumed by catalogue-diff and scan-demos tests).
let fixtureDir: string;

async function writeSetupFixtures(targetDir: string): Promise<void> {
  const docxPath = join(targetDir, "sample.docx");
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "1. Executive summary",
                bold: true,
                font: "Arial",
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Acme Industrial is evaluating SMR process-heat applications for European sites.",
                font: "Arial",
                color: "0B3D91",
              }),
            ],
          }),
        ],
      },
    ],
  });
  await writeFile(docxPath, await Packer.toBuffer(doc));

  const pptxPath = join(targetDir, "sample.pptx");
  const pptx = new pptxgen();
  const slide = pptx.addSlide();
  slide.addText("Strategic context", {
    x: 0.5,
    y: 0.5,
    w: 8,
    h: 1,
    fontFace: "Calibri",
    color: "E8A33D",
  });
  slide.addText("Market scan and recommendation timeline for the board.", {
    x: 0.5,
    y: 1.5,
    w: 8,
    h: 1.5,
    fontFace: "Calibri",
    color: "0B3D91",
  });
  const pptxData = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  await writeFile(pptxPath, pptxData);

  const pdfPath = join(targetDir, "sample.pdf");
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  page.drawText("Fees and delivery assumptions for the engagement.", {
    x: 50,
    y: 700,
    size: 12,
    font,
  });
  await writeFile(pdfPath, await pdfDoc.save());
}

describe("setup ingestion (T-41)", () => {
  beforeAll(async () => {
    fixtureDir = mkdtempSync(join(tmpdir(), "setup-ingestion-"));
    await writeSetupFixtures(fixtureDir);
  });

  afterAll(() => {
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it.each([
    ["sample.docx", "docx"],
    ["sample.pptx", "pptx"],
    ["sample.pdf", "pdf"],
  ] as const)(
    "%s produces text, colors, and font fields",
    async (name, format) => {
      const analysis = await analyzeDemoFile(join(fixtureDir, name));
      expect(analysis.format).toBe(format);
      expect(analysis.textContent.length).toBeGreaterThan(10);
      expect(Array.isArray(analysis.observedColors)).toBe(true);
      expect(Array.isArray(analysis.fontFamilies)).toBe(true);
      if (format === "docx") {
        expect(analysis.observedColors.length).toBeGreaterThan(0);
        expect(analysis.fontFamilies.length).toBeGreaterThan(0);
      }
      if (format === "pptx") {
        expect(analysis.fontFamilies.length).toBeGreaterThan(0);
      }
    },
  );

  it("analyzeDemoDirectory merges into demo-analysis.json shape", async () => {
    const analysis = await analyzeDemoDirectory(fixtureDir);
    expect(analysis.schemaVersion).toBe(DEMO_ANALYSIS_SCHEMA_VERSION);
    expect(analysis.files).toHaveLength(3);
    expect(analysis.textContent.length).toBeGreaterThan(20);
    expect(analysis.observedColors.length).toBeGreaterThan(0);

    const outPath = join(fixtureDir, "demo-analysis.json");
    await writeDemoAnalysis(analysis, outPath);
    const merged = await analyzeDemoDirectory(fixtureDir);
    expect(merged.files.length).toBeGreaterThanOrEqual(3);
  });
});

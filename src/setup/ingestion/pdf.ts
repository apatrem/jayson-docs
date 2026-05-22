import { readFile } from "node:fs/promises";
import officeParser from "officeparser";
import type { DemoFileAnalysis } from "./types";
import {
  extractColorsFromPlainText,
  guessSectionPatternsFromText,
  splitTextSamples,
  uniqueSorted,
} from "./ooxml-styles";

export async function ingestPdf(filePath: string): Promise<DemoFileAnalysis> {
  const buffer = await readFile(filePath);
  const parsed = await officeParser.parseOfficeAsync(buffer);
  const textContent =
    typeof parsed === "string"
      ? parsed.trim()
      : String(parsed ?? "").trim();

  return {
    fileName: filePath.split(/[/\\]/).pop() ?? filePath,
    format: "pdf",
    textContent,
    textSamples: splitTextSamples(textContent),
    observedColors: extractColorsFromPlainText(textContent),
    fontFamilies: [],
    sectionPatterns: uniqueSorted([
      ...guessSectionPatternsFromText(textContent),
    ]),
  };
}

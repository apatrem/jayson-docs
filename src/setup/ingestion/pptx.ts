import { readFile } from "node:fs/promises";
import officeParser from "officeparser";
import type { DemoFileAnalysis } from "./types";
import { extractOoxmlStylesFromBuffer, splitTextSamples } from "./ooxml-styles";

export async function ingestPptx(filePath: string): Promise<DemoFileAnalysis> {
  const buffer = await readFile(filePath);
  const parsed = await officeParser.parseOfficeAsync(buffer);
  const textContent =
    typeof parsed === "string"
      ? parsed.trim()
      : String(parsed ?? "").trim();

  const ooxml = await extractOoxmlStylesFromBuffer(buffer, "pptx");

  return {
    fileName: filePath.split(/[/\\]/).pop() ?? filePath,
    format: "pptx",
    textContent,
    textSamples: splitTextSamples(textContent),
    observedColors: ooxml.colors,
    fontFamilies: ooxml.fontFamilies,
    sectionPatterns: ooxml.sectionPatterns,
  };
}

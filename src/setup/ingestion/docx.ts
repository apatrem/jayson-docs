import { readFile } from "node:fs/promises";
import mammoth from "mammoth";
import type { DemoFileAnalysis } from "./types";
import {
  extractOoxmlStylesFromBuffer,
  guessSectionPatternsFromText,
  splitTextSamples,
  uniqueSorted,
} from "./ooxml-styles";

export async function ingestDocx(filePath: string): Promise<DemoFileAnalysis> {
  const buffer = await readFile(filePath);
  const [rawText, html, ooxml] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
    extractOoxmlStylesFromBuffer(buffer, "docx"),
  ]);

  const textContent = rawText.value.trim();
  const htmlColors = extractColorsFromHtml(html.value);

  return {
    fileName: filePath.split(/[/\\]/).pop() ?? filePath,
    format: "docx",
    textContent,
    textSamples: splitTextSamples(textContent),
    observedColors: uniqueSorted([...ooxml.colors, ...htmlColors]),
    fontFamilies: ooxml.fontFamilies,
    sectionPatterns: uniqueSorted([
      ...guessSectionPatternsFromText(textContent),
    ]),
  };
}

function extractColorsFromHtml(html: string): string[] {
  const found: string[] = [];
  const styleAttr = /color:\s*#?([0-9A-Fa-f]{6})/gi;
  let match = styleAttr.exec(html);
  while (match) {
    found.push(`#${(match[1] ?? "").toUpperCase()}`);
    match = styleAttr.exec(html);
  }
  return uniqueSorted(found);
}

import { readdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { ingestDocx } from "./docx";
import { ingestPdf } from "./pdf";
import { ingestPptx } from "./pptx";
import {
  DEMO_ANALYSIS_SCHEMA_VERSION,
  type DemoAnalysis,
  type DemoFileAnalysis,
  type DemoFileFormat,
} from "./types";
import { uniqueSorted } from "./ooxml-styles";

const FORMAT_BY_EXT: Record<string, DemoFileFormat> = {
  ".docx": "docx",
  ".pptx": "pptx",
  ".pdf": "pdf",
};

export function formatForPath(filePath: string): DemoFileFormat | null {
  const ext = extname(filePath).toLowerCase();
  return FORMAT_BY_EXT[ext] ?? null;
}

export async function analyzeDemoFile(
  filePath: string,
): Promise<DemoFileAnalysis> {
  const format = formatForPath(filePath);
  if (!format) {
    throw new Error(`analyzeDemoFile: unsupported file type "${filePath}"`);
  }
  switch (format) {
    case "docx":
      return ingestDocx(filePath);
    case "pptx":
      return ingestPptx(filePath);
    case "pdf":
      return ingestPdf(filePath);
  }
}

export function mergeDemoAnalyses(
  sourceDirectory: string,
  files: DemoFileAnalysis[],
): DemoAnalysis {
  const textContent = files.map((f) => f.textContent).join("\n\n").trim();
  return {
    schemaVersion: DEMO_ANALYSIS_SCHEMA_VERSION,
    analyzedAt: new Date().toISOString(),
    sourceDirectory,
    files,
    textContent,
    observedColors: uniqueSorted(files.flatMap((f) => f.observedColors)),
    fontFamilies: uniqueSorted(files.flatMap((f) => f.fontFamilies)),
    sectionPatterns: uniqueSorted(files.flatMap((f) => f.sectionPatterns)),
  };
}

export async function analyzeDemoDirectory(
  directory: string,
): Promise<DemoAnalysis> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = entries
    .filter((e) => e.isFile() && formatForPath(e.name))
    .map((e) => join(directory, e.name))
    .sort((a, b) => a.localeCompare(b));

  const files: DemoFileAnalysis[] = [];
  for (const filePath of paths) {
    files.push(await analyzeDemoFile(filePath));
  }
  return mergeDemoAnalyses(directory, files);
}

export async function writeDemoAnalysis(
  analysis: DemoAnalysis,
  outputPath: string,
): Promise<void> {
  await writeFile(outputPath, `${JSON.stringify(analysis, null, 2)}\n`, "utf8");
}

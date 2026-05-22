export const DEMO_ANALYSIS_SCHEMA_VERSION = "1.0.0";

export type DemoFileFormat = "docx" | "pptx" | "pdf";

export interface DemoFileAnalysis {
  fileName: string;
  format: DemoFileFormat;
  textContent: string;
  textSamples: string[];
  observedColors: string[];
  fontFamilies: string[];
  sectionPatterns: string[];
}

export interface DemoAnalysis {
  schemaVersion: "1.0.0";
  analyzedAt: string;
  sourceDirectory: string;
  files: DemoFileAnalysis[];
  textContent: string;
  observedColors: string[];
  fontFamilies: string[];
  sectionPatterns: string[];
}

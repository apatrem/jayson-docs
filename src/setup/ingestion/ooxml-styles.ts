import JSZip from "jszip";

const HEX_COLOR = /\b([0-9A-Fa-f]{6})\b/g;
const DOCX_COLOR_ATTR = /<w:color[^>]*w:val="([0-9A-Fa-f]{6})"/gi;
const DOCX_FONT_ATTR =
  /<w:rFonts[^>]*(?:w:ascii|w:hAnsi)="([^"]+)"/gi;
const THEME_COLOR = /<a:srgbClr[^>]*val="([0-9A-Fa-f]{6})"/gi;
const THEME_FONT = /<a:(?:latin|ea|cs)[^>]*typeface="([^"]+)"/gi;
const PPTX_HEADING = /<p:ph[^>]*type="(title|ctrTitle|subTitle|body)"/gi;

function normalizeHex(raw: string): string | null {
  const cleaned = raw.replace(/#/g, "").trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) return null;
  return `#${cleaned.toUpperCase()}`;
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function extractColorsFromXml(xml: string): string[] {
  const found: string[] = [];
  for (const pattern of [DOCX_COLOR_ATTR, THEME_COLOR]) {
    pattern.lastIndex = 0;
    let match = pattern.exec(xml);
    while (match) {
      const hex = normalizeHex(match[1] ?? "");
      if (hex) found.push(hex);
      match = pattern.exec(xml);
    }
  }
  return uniqueSorted(found);
}

export function extractFontsFromXml(xml: string): string[] {
  const found: string[] = [];
  for (const pattern of [DOCX_FONT_ATTR, THEME_FONT]) {
    pattern.lastIndex = 0;
    let match = pattern.exec(xml);
    while (match) {
      const name = match[1]?.trim();
      if (name) found.push(name);
      match = pattern.exec(xml);
    }
  }
  return uniqueSorted(found);
}

export function extractSectionPatternsFromXml(xml: string): string[] {
  const patterns: string[] = [];
  PPTX_HEADING.lastIndex = 0;
  let match = PPTX_HEADING.exec(xml);
  while (match) {
    const kind = match[1];
    if (kind) patterns.push(`slide:${kind}`);
    match = PPTX_HEADING.exec(xml);
  }
  return uniqueSorted(patterns);
}

export async function readZipTextEntries(
  buffer: Buffer,
  filter: (path: string) => boolean,
): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const parts: string[] = [];
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !filter(path)) continue;
    parts.push(await entry.async("string"));
  }
  return parts.join("\n");
}

export async function extractOoxmlStylesFromBuffer(
  buffer: Buffer,
  kind: "docx" | "pptx",
): Promise<{ colors: string[]; fontFamilies: string[]; sectionPatterns: string[] }> {
  const filter =
    kind === "docx"
      ? (path: string) =>
          path.startsWith("word/") && path.endsWith(".xml")
      : (path: string) =>
          path.startsWith("ppt/") && path.endsWith(".xml");

  const xml = await readZipTextEntries(buffer, filter);
  return {
    colors: extractColorsFromXml(xml),
    fontFamilies: extractFontsFromXml(xml),
    sectionPatterns:
      kind === "pptx" ? extractSectionPatternsFromXml(xml) : [],
  };
}

export function splitTextSamples(text: string, maxSamples = 12): string[] {
  return text
    .split(/\n{2,}|\r\n\r\n/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 20)
    .slice(0, maxSamples);
}

export function guessSectionPatternsFromText(text: string): string[] {
  const patterns: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 40)) {
    if (line.length < 4 || line.length > 80) continue;
    if (/^\d+(\.\d+)*\s+\S/.test(line)) {
      patterns.push(`numbered:${line.slice(0, 40)}`);
    } else if (line === line.toUpperCase() && /[A-Z]/.test(line)) {
      patterns.push(`heading:${line.slice(0, 40)}`);
    }
  }
  return uniqueSorted(patterns).slice(0, 12);
}

/** Fallback color scan for PDF content streams (rarely populated). */
export function extractColorsFromPlainText(text: string): string[] {
  const found: string[] = [];
  let match = HEX_COLOR.exec(text);
  while (match) {
    const hex = normalizeHex(match[1] ?? "");
    if (hex) found.push(hex);
    match = HEX_COLOR.exec(text);
  }
  return uniqueSorted(found);
}

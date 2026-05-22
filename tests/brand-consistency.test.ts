import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { DeckRenderer } from "../src/renderer/DeckRenderer";
import { DocumentRenderer } from "../src/renderer/DocumentRenderer";
import type { BrandTokens } from "../src/schema/brand";
import { BrandTokensSchema } from "../src/schema/brand";
import type { DocModel } from "../src/schema/docmodel";
import { validateDocModel } from "../src/schema/validate";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const brand: BrandTokens = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

function loadDocModel(path: string): DocModel {
  const raw: unknown = parse(readFileSync(path, "utf8"));
  const result = validateDocModel(raw);
  if (!result.ok) {
    throw new Error(result.errors.map((e) => e.path).join(", "));
  }
  return result.doc;
}

interface StyleTokens {
  fontFamilies: Set<string>;
  colors: Set<string>;
  spacingUnits: Set<string>;
}

function extractStyleTokens(html: string): StyleTokens {
  const fontFamilies = new Set<string>();
  const colors = new Set<string>();
  const spacingUnits = new Set<string>();

  const styleRe = /style="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = styleRe.exec(html)) !== null) {
    const style = match[1] ?? "";
    const fontFamily = style.match(/font-family:\s*([^;]+)/i)?.[1];
    if (fontFamily) fontFamilies.add(fontFamily.trim());

    for (const colorDecl of style.matchAll(
      /(?:^|;)\s*(?:color|background-color|border(?:-left)?):\s*([^;]+)/gi,
    )) {
      const value = colorDecl[1]?.trim();
      if (value) colors.add(value);
    }

    for (const spaceDecl of style.matchAll(
      /(?:margin|padding)(?:-[a-z]+)?:\s*([^;]+)/gi,
    )) {
      const value = spaceDecl[1]?.trim();
      if (value && /\d+px/.test(value)) spacingUnits.add(value);
    }
  }

  return { fontFamilies, colors, spacingUnits };
}

function intersect<T>(a: Set<T>, b: Set<T>): Set<T> {
  const out = new Set<T>();
  for (const item of a) {
    if (b.has(item)) out.add(item);
  }
  return out;
}

describe("brand consistency across fixtures (T-59)", () => {
  const paths = {
    sharedFolderPath: repoRoot,
    docFolderPath: join(repoRoot, "examples"),
  };

  it("proposal and deck share font families, colors, and px spacing units", () => {
    const proposal = loadDocModel(join(repoRoot, "examples/sample-proposal.yaml"));
    const deck = loadDocModel(join(repoRoot, "examples/sample-deck.yaml"));
    if (proposal.kind !== "document" || deck.kind !== "deck") {
      throw new Error("expected document + deck fixtures");
    }

    const proposalHtml = renderToStaticMarkup(
      createElement(DocumentRenderer, { doc: proposal, brand, ...paths }),
    );
    const deckHtml = renderToStaticMarkup(
      createElement(DeckRenderer, { deck, brand, ...paths }),
    );

    const proposalTokens = extractStyleTokens(proposalHtml);
    const deckTokens = extractStyleTokens(deckHtml);

    expect(proposalTokens.fontFamilies.size).toBeGreaterThan(0);
    expect(deckTokens.fontFamilies.size).toBeGreaterThan(0);
    expect(intersect(proposalTokens.fontFamilies, deckTokens.fontFamilies).size).toBeGreaterThan(0);

    expect(proposalTokens.colors.size).toBeGreaterThan(0);
    expect(deckTokens.colors.size).toBeGreaterThan(0);
    expect(intersect(proposalTokens.colors, deckTokens.colors).size).toBeGreaterThan(0);

    expect(proposalTokens.spacingUnits.size).toBeGreaterThan(0);
    expect(deckTokens.spacingUnits.size).toBeGreaterThan(0);
    expect(intersect(proposalTokens.spacingUnits, deckTokens.spacingUnits).size).toBeGreaterThan(0);
  });
});

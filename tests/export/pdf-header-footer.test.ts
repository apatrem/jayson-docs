import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  buildPdfOptions,
  buildFooterTemplate,
  buildHeaderTemplate,
  loadBrandTokens,
  loadDocumentModel,
  renderDocumentHtml,
} from "../../src/export/pdf";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("PDF header/footer templates (T-53)", () => {
  const brand = loadBrandTokens(join(repoRoot, "brand.example.yaml"));
  const doc = loadDocumentModel(join(repoRoot, "examples/sample-proposal.yaml"));

  it("header template includes logo image and project title", () => {
    const header = buildHeaderTemplate(doc, brand, repoRoot);
    expect(header).toContain("<img");
    expect(header).toContain("data:image/svg+xml;base64,");
    expect(header).toContain("SMR Heat Strategy Assessment");
  });

  it("footer template includes confidentiality notice and page number slots", () => {
    const footer = buildFooterTemplate(doc, brand);
    expect(footer).toContain("Confidential");
    expect(footer).toContain('class="pageNumber"');
    expect(footer).toContain('class="totalPages"');
    expect(footer).toContain("Page ");
  });

  it("loads logo from brand assets when present", () => {
    const svg = readFileSync(join(repoRoot, "assets/logo/primary.svg"), "utf8");
    expect(svg).toContain("ASP");
    const header = buildHeaderTemplate(doc, brand, repoRoot);
    expect(header.length).toBeGreaterThan(100);
  });

  it("loads and renders deck fixtures through the deck renderer", async () => {
    const deck = loadDocumentModel(join(repoRoot, "examples/sample-deck.yaml"));
    if (deck.kind !== "deck") {
      throw new Error("expected deck fixture");
    }

    const html = await renderDocumentHtml(deck, brand, {
      sharedFolderPath: repoRoot,
      docFolderPath: join(repoRoot, "examples"),
    });

    expect(html).toContain('data-doc-kind="deck"');
    expect(html).toContain('data-slide-layout="cover"');
    expect(html).toContain('data-slide-layout="closing"');
  });

  it("uses deck dimensions for PDF page options", () => {
    const options = buildPdfOptions(
      brand,
      { headerTemplate: "<span></span>", footerTemplate: "<span></span>" },
      "deck",
    );

    expect(options).toMatchObject({
      width: "1920px",
      height: "1080px",
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  });
});

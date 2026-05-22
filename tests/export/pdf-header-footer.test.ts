import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  buildFooterTemplate,
  buildHeaderTemplate,
  loadBrandTokens,
  loadDocumentModel,
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
});

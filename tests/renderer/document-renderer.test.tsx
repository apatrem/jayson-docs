import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { DocumentRenderer } from "../../src/renderer/DocumentRenderer";
import type { BrandTokens } from "../../src/schema/brand";
import { BrandTokensSchema } from "../../src/schema/brand";
import { validateDocModel } from "../../src/schema/validate";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = {
  ...BrandTokensSchema.parse(
    parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
  ),
  headshots: {
    "jane-smith": "assets/headshots/jane-smith.svg",
    "pierre-dubois": "assets/headshots/pierre-dubois.svg",
    "marie-chen": "assets/headshots/marie-chen.svg",
  },
} as BrandTokens;

function loadProposal() {
  const raw: unknown = parse(
    readFileSync(join(repoRoot, "examples/sample-proposal.yaml"), "utf8"),
  );
  const result = validateDocModel(raw);
  if (!result.ok) {
    throw new Error(
      `sample-proposal.yaml invalid: ${result.errors.map((e) => e.path).join(", ")}`,
    );
  }
  if (result.doc.kind !== "document") {
    throw new Error("expected document kind");
  }
  return result.doc;
}

describe("DocumentRenderer (T-51)", () => {
  it("renders sample-proposal.yaml end-to-end with brand tokens", () => {
    const doc = loadProposal();
    const html = renderToStaticMarkup(
      createElement(DocumentRenderer, {
        doc,
        brand,
        sharedFolderPath: join(repoRoot, "examples"),
        docFolderPath: join(repoRoot, "examples"),
      }),
    );

    expect(html).toContain('data-doc-kind="document"');
    expect(html).toContain("Executive summary");
    expect(html).toContain('data-block-type="prose"');
    expect(html).toContain('data-block-type="kpi-cards"');
    expect(html).toContain('data-block-type="callout"');
    expect(html).toContain("Acme Industrial");
    expect(html).toMatch(/#0B3D91|rgb\(11,\s*61,\s*145\)/);
  });

  it("is deterministic for the same DocModel input", () => {
    const doc = loadProposal();
    const first = renderToStaticMarkup(
      createElement(DocumentRenderer, { doc, brand }),
    );
    const second = renderToStaticMarkup(
      createElement(DocumentRenderer, { doc, brand }),
    );
    expect(first).toBe(second);
  });
});

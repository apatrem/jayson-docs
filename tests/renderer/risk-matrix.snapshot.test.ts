import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { RiskMatrix } from "../../src/blocks/risk-matrix";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { RiskMatrixBlock } from "../../src/blocks/risk-matrix/schema";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: RiskMatrixBlock = {
  id: "test-risk-matrix",
  type: "risk-matrix",
  gridSize: "3x3",
  xAxisLabel: "Likelihood",
  yAxisLabel: "Impact",
  risks: [
    { label: "Regulatory change", x: 2, y: 2, severity: "high" },
    { label: "Key staff turnover", x: 1, y: 2, severity: "medium" },
    { label: "Scope creep", x: 2, y: 1, severity: "low" },
  ],
};

describe("RiskMatrix snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(RiskMatrix, { block }),
      ),
    );

    expect(html).toContain('data-block-type="risk-matrix"');
    expect(html).toContain("Likelihood");
    expect(html).toContain("Impact");
    expect(html).toContain("Regulatory change");
    expect(html).toContain("Key staff turnover");
  });
});

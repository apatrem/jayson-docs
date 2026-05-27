import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { KpiCards } from "../../src/blocks/kpi-cards";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { KpiCardsBlock } from "../../src/blocks/kpi-cards/schema";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: KpiCardsBlock = {
  id: "test-kpi-cards",
  type: "kpi-cards",
  cards: [
    { value: "94%", label: "Client satisfaction", trend: "up", emphasis: "positive" },
    { value: "12", label: "Active projects", trend: "flat", emphasis: "neutral" },
    { value: "€2.4M", label: "Pipeline value", trend: "up", emphasis: "brand" },
  ],
};

describe("KpiCards snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(KpiCards, { block }),
      ),
    );

    expect(html).toContain('data-block-type="kpi-cards"');
    expect(html).toContain("94%");
    expect(html).toContain("Client satisfaction");
    expect(html).toContain("€2.4M");
    expect(html).toContain("Pipeline value");
  });
});

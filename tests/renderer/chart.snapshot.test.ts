import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Chart } from "../../src/renderer/blocks/Chart";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { ChartBlock } from "../../src/schema/blocks/chart";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: ChartBlock = {
  id: "test-chart",
  type: "chart",
  chartType: "bar",
  title: "Revenue by Quarter",
  data: {
    series: [{ name: "Revenue", values: [100, 120, 90, 150] }],
    xLabels: ["Q1", "Q2", "Q3", "Q4"],
  },
  palette: "qualitative",
  showLegend: true,
  legendPosition: "bottom",
  showDataLabels: false,
};

describe("Chart snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Chart, { block }),
      ),
    );

    expect(html).toContain('data-block-type="chart"');
    expect(html).toContain("Revenue by Quarter");
  });
});

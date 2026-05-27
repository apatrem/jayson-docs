import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Roadmap } from "../../src/renderer/blocks/Roadmap";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { RoadmapBlock } from "../../src/schema/blocks/roadmap";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: RoadmapBlock = {
  id: "test-roadmap",
  type: "roadmap",
  timeUnit: "quarter",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  workstreams: [
    {
      label: "Discovery",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
      color: "brand.primary",
    },
    {
      label: "Design",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      color: "brand.secondary",
    },
    {
      label: "Delivery",
      startDate: "2026-07-01",
      endDate: "2026-12-31",
      color: "auto",
    },
  ],
};

describe("Roadmap snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Roadmap, { block }),
      ),
    );

    expect(html).toContain('data-block-type="roadmap"');
    expect(html).toContain("Discovery");
    expect(html).toContain("Design");
    expect(html).toContain("Delivery");
  });
});

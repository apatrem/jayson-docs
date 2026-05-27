import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Timeline } from "../../src/renderer/blocks/Timeline";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { TimelineBlock } from "../../src/schema/blocks/timeline";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: TimelineBlock = {
  id: "test-timeline",
  type: "timeline",
  orientation: "horizontal",
  connector: "arrow",
  phases: [
    { label: "Diagnose", subtitle: "Weeks 1–2", body: "Assess current state" },
    { label: "Design", subtitle: "Weeks 3–5", body: "Develop recommendations" },
    { label: "Deliver", subtitle: "Weeks 6–8", body: "Implement and handover" },
  ],
};

describe("Timeline snapshot (T-141a)", () => {
  it("renders horizontal under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Timeline, { block }),
      ),
    );

    expect(html).toContain('data-block-type="timeline"');
    expect(html).toContain("Diagnose");
    expect(html).toContain("Design");
    expect(html).toContain("Deliver");
    expect(html).toContain("Weeks 1–2");
  });

  it("renders vertical under new brand tokens", () => {
    const verticalBlock: TimelineBlock = { ...block, orientation: "vertical" };
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Timeline, { block: verticalBlock }),
      ),
    );

    expect(html).toContain('data-block-type="timeline"');
    expect(html).toContain("Diagnose");
  });
});

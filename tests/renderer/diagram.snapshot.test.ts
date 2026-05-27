import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Diagram } from "../../src/renderer/blocks/Diagram";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { DiagramBlock } from "../../src/schema/blocks/diagram";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const block: DiagramBlock = {
  id: "test-diagram",
  type: "diagram",
  source: "graph LR;\n  A[Start] --> B[Process] --> C[End]",
  title: "Process Flow",
  width: "large",
};

describe("Diagram snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Diagram, { block }),
      ),
    );

    expect(html).toContain('data-block-type="diagram"');
  });
});

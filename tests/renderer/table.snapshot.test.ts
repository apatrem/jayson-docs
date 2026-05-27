import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Table } from "../../src/blocks/table";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { TableBlock } from "../../src/blocks/table/schema";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const emptyCell = (): { type: "doc"; content: [] } => ({
  type: "doc",
  content: [],
});

const textCell = (text: string) => ({
  type: "doc" as const,
  content: [
    {
      type: "paragraph" as const,
      content: [{ type: "text" as const, text }],
    },
  ],
});

const block: TableBlock = {
  id: "test-table",
  type: "table",
  columns: [
    { header: "Initiative", align: "left" },
    { header: "Owner", align: "left" },
    { header: "Status", align: "center" },
  ],
  rows: [
    { cells: [textCell("Cost reduction"), textCell("Finance"), textCell("On track")] },
    { cells: [textCell("Market expansion"), textCell("Strategy"), textCell("At risk")] },
  ],
  caption: "Strategic initiatives overview",
};

// Satisfy TypeScript — the function is used to avoid unused-variable lint
void emptyCell;

describe("Table snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Table, { block }),
      ),
    );

    expect(html).toContain('data-block-type="table"');
    expect(html).toContain("Initiative");
    expect(html).toContain("Owner");
    expect(html).toContain("Status");
    expect(html).toContain("Cost reduction");
    expect(html).toContain("Strategic initiatives overview");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
    // header fill: surfaceBackground neutral.50
    expect(html).toContain("#F7F8FA");
  });
});

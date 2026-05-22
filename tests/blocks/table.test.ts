import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  DocTableTipTapNode,
  tableBlockEditorExtensions,
  tableBlockToProseMirror,
  tableBlockToTipTapTableContent,
  proseMirrorToTableBlock,
} from "../../src/editor/nodes/TableNode";
import { Table } from "../../src/renderer/blocks/Table";
import {
  TableBlockSchema,
  type TableBlock,
} from "../../src/schema/blocks/table";
import type { BrandTokens } from "../../src/schema/brand";

const cell = (text: string) => ({
  type: "doc" as const,
  content: [
    {
      type: "paragraph" as const,
      content: [{ type: "text" as const, text }],
    },
  ],
});

const validTable: TableBlock = {
  id: "b5-table-01",
  type: "table",
  columns: [
    { header: "Phase", align: "left", width: "30%" },
    { header: "Duration", align: "center", width: "15%" },
    { header: "Honoraires", align: "right", width: "20%" },
  ],
  rows: [
    {
      cells: [cell("Diagnostic"), cell("3 wk"), cell("€120k")],
    },
    {
      cells: [cell("Market scan"), cell("3 wk"), cell("€100k")],
    },
  ],
  caption: "Total: 12 weeks · €440k (excl. VAT).",
};

const testBrandTokens = {
  schemaVersion: "1.0.0",
  lastUpdated: "2026-05-21",
  identity: { name: "Test" },
  logo: { primary: { svg: "logo.svg", minWidthPx: 80, intrinsicAspect: 3.2 } },
  colors: {
    brand: {
      primary: "#0B3D91",
      secondary: "#E8A33D",
      dark: "#0A1A2F",
      light: "#F4F7FC",
    },
    neutral: {
      "0": "#FFFFFF",
      "200": "#E2E8F0",
      "600": "#475569",
      "800": "#1E293B",
    },
    semantic: {
      surfaceBackground: "neutral.200",
      border: "neutral.200",
      textPrimary: "neutral.800",
      textSecondary: "neutral.600",
      link: "brand.primary",
      headingPrimary: "brand.dark",
      accent: "brand.secondary",
    },
    chartPalette: {
      qualitative: [
        "#0B3D91",
        "#E8A33D",
        "#2D9C5A",
        "#C44536",
        "#7C3AED",
        "#0891B2",
        "#65A30D",
        "#DB2777",
      ],
      sequential: ["#F4F7FC", "#C9D7EF", "#7FA3DC", "#3870C0", "#0B3D91"],
    },
  },
  typography: {
    fonts: {
      heading: { family: "Heading", source: "system" as const, weights: [600] },
      body: { family: "Body", source: "system" as const, weights: [400] },
      mono: { family: "Mono", source: "system" as const, weights: [400] },
    },
    scale: { h1: 32, h2: 24, h3: 20, h4: 16, body: 11, caption: 9 },
    lineHeight: { tight: 1.15, normal: 1.5 },
  },
  spacing: { unit: 4, scale: [0, 1, 2, 3, 4, 6, 8] },
  page: {
    size: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 24, right: 18, bottom: 22, left: 18 },
  },
  deck: {
    slideSize: "16:9" as const,
    dimensionsPx: { width: 1920, height: 1080 },
    margins: { top: 72, right: 96, bottom: 72, left: 96 },
  },
  elements: {},
  charts: {},
} satisfies BrandTokens;

describe("TableBlockSchema — valid fixtures", () => {
  it("accepts a fees table from sample-proposal shape", () => {
    expect(TableBlockSchema.parse(validTable)).toEqual(validTable);
  });
});

describe("TableBlockSchema — invalid fixtures", () => {
  it("rejects row cell count mismatch", () => {
    const result = TableBlockSchema.safeParse({
      ...validTable,
      rows: [{ cells: [cell("only one")] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 columns", () => {
    expect(
      TableBlockSchema.safeParse({
        ...validTable,
        columns: [{ header: "Only", align: "left" }],
      }).success,
    ).toBe(false);
  });

  it("rejects more than 30 rows", () => {
    const rows = Array.from({ length: 31 }, () => ({
      cells: [cell("a"), cell("b"), cell("c")],
    }));
    expect(
      TableBlockSchema.safeParse({ ...validTable, rows }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      TableBlockSchema.safeParse({ ...validTable, extra: true }).success,
    ).toBe(false);
  });
});

describe("Table renderer", () => {
  const renderWithBrand = (block: TableBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(Table, { block }),
      ),
    );

  it("renders table with headers, body cells, and caption", () => {
    const html = renderWithBrand(validTable);
    expect(html).toContain('data-block-type="table"');
    expect(html).toContain("<thead");
    expect(html).toContain("Phase");
    expect(html).toContain("Diagnostic");
    expect(html).toContain("€440k");
  });

  it("applies column width hints via colgroup", () => {
    const html = renderWithBrand(validTable);
    expect(html).toContain('width:30%');
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validTable)).toBe(renderWithBrand(validTable));
  });
});

describe("Table mapping", () => {
  it("round-trips doc-table atom losslessly", () => {
    const pm = tableBlockToProseMirror(validTable);
    expect(proseMirrorToTableBlock(pm)).toEqual(validTable);
  });

  it("builds nested TipTap table content with header row", () => {
    const nested = tableBlockToTipTapTableContent(validTable);
    expect(nested.type).toBe("table");
    expect(nested.content[0]?.content[0]?.type).toBe("tableHeader");
    expect(nested.content[1]?.content[0]?.type).toBe("tableCell");
  });
});

describe("Table TipTap integration", () => {
  it("registers insertDocTable on the doc-table atom", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, DocTableTipTapNode],
    });
    editor.commands.insertDocTable();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"docTable"');
    editor.destroy();
  });

  it("loads @tiptap/extension-table kit with paragraph-only cells", () => {
    const extensions = tableBlockEditorExtensions();
    expect(extensions.map((ext) => ext.name)).toEqual(
      expect.arrayContaining(["table", "tableRow", "tableHeader", "tableCell"]),
    );
  });
});

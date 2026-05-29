/**
 * src/blocks/table/index.tsx — self-contained registry manifest for the
 * Table block.
 *
 * Folds in the legacy TableNode.tsx (editor) and Table.tsx (renderer)
 * into a single co-located file. Default-exports the BlockRegistryRecord
 * consumed by src/blocks/runtime-registry.ts.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import TipTapTable from "@tiptap/extension-table";
import TipTapTableCell from "@tiptap/extension-table-cell";
import TipTapTableHeader from "@tiptap/extension-table-header";
import TipTapTableRow from "@tiptap/extension-table-row";
import type { JSONContent } from "@tiptap/react";
import type { CSSProperties, ComponentType, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import { ProseRenderer } from "../../renderer/ProseRenderer";
import type { ProseMirrorFragment } from "../../schema/prosemirror-fragment";
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";
import type { ZodType } from "zod";
import {
  TableBlockDataSchema,
  emptyTableCell,
  type TableBlock,
  type TableColumn,
  type TableColumnAlign,
  type TableRow as TableBlockRow,
} from "./schema";

// ── Re-exports for backward compatibility ─────────────────────────────────
export {
  TableColumnAlignSchema,
  TableColumnSchema,
  TableRowSchema,
  TableBlockDataSchema,
  TableBlockSchema,
  defaultTableBlock,
  emptyTableCell,
  type TableColumnAlign,
  type TableColumn,
  type TableRow,
  type TableBlock,
} from "./schema";

// ── TipTap commands augmentation ─────────────────────────────────────────
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    docTable: {
      insertDocTable: (attrs?: {
        columns?: TableColumn[];
        rows?: TableBlockRow[];
        caption?: string;
      }) => ReturnType;
    };
  }
}

// ── Table kit helpers ─────────────────────────────────────────────────────
const CELL_STYLE = "border:1px solid #E2E8F0;padding:4px 8px;vertical-align:top;";
const HEADER_STYLE = `${CELL_STYLE}background:#F8FAFC;font-weight:600;`;

// Cells hold paragraph-only rich text (matches the DocModel cell fragment).
// renderHTML adds borders so the editable grid reads like the rendered table.
export const ConstrainedTableCell = TipTapTableCell.extend({
  content: "paragraph+",
  renderHTML({ HTMLAttributes }) {
    return ["td", mergeAttributes(HTMLAttributes, { style: CELL_STYLE }), 0];
  },
});

// Header cells additionally carry the per-column metadata (align, width) so it
// travels with the column when columns are added/removed — keeping the DocModel
// column ⇄ header-cell round-trip lossless without a separate indexed attr.
export const ConstrainedTableHeader = TipTapTableHeader.extend({
  content: "paragraph+",
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      align: {
        default: "left",
        parseHTML: (el: HTMLElement) =>
          el.getAttribute("data-align") ?? el.style.textAlign ?? "left",
        renderHTML: (attrs: { align: TableColumnAlign }) => ({
          "data-align": attrs.align,
          style: `text-align:${attrs.align}`,
        }),
      },
      colWidth: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-col-width"),
        renderHTML: (attrs: { colWidth: string | null }) =>
          attrs.colWidth ? { "data-col-width": attrs.colWidth } : {},
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ["th", mergeAttributes(HTMLAttributes, { style: HEADER_STYLE }), 0];
  },
});

/**
 * TipTap table kit with paragraph-only cells and metadata-bearing headers.
 * Registered into the editor's closed schema so doc-table grids edit inline.
 */
export function tableBlockEditorExtensions() {
  return [
    TipTapTable.configure({
      resizable: true,
      HTMLAttributes: { class: "doc-table-grid" },
    }),
    TipTapTableRow,
    ConstrainedTableHeader,
    ConstrainedTableCell,
  ];
}

// ── TipTap node ───────────────────────────────────────────────────────────
export const DocTableTipTapNode = Node.create({
  name: "docTable",
  group: "block",
  content: "table",
  defining: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      caption: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-caption") ?? "",
        renderHTML: (attrs: { caption: string }) => ({
          "data-caption": attrs.caption,
        }),
      },
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") ?? "",
        renderHTML: (attrs: { note: string }) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-block-type="table"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // No inline margin: an inline style would beat the inter-block gap rule and
    // the per-block spaceBefore decoration (ADR-0018). The figure's default UA
    // margin is reset in editor.css instead, leaving margin-top to those rules.
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-block-type": "table" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertDocTable:
        (attrs = {}) =>
        ({ commands }) => {
          const columns = attrs.columns ?? [
            { header: "Column A", align: "left" as const },
            { header: "Column B", align: "left" as const },
          ];
          const rows = attrs.rows ?? [{ cells: columns.map(() => emptyTableCell()) }];
          const block: TableBlock = {
            id: crypto.randomUUID(),
            type: "table",
            columns,
            rows,
            ...(attrs.caption ? { caption: attrs.caption } : {}),
          };
          return commands.insertContent({
            type: this.name,
            attrs: { blockId: block.id, caption: block.caption ?? "", note: "" },
            content: [tableBlockToTipTapTableContent(block)],
          });
        },
    };
  },
});

// ── PM helpers ────────────────────────────────────────────────────────────
// The doc-table block maps to a `docTable` node wrapping one native `table`.
// Column metadata (align/width) rides on the header cells so add/remove-column
// stays lossless; the doc-table node carries blockId/caption/note.
type TableCellPm = { content?: ProseMirrorFragment["content"]; attrs?: Record<string, unknown> };
type TableRowPm = { type?: string; content?: TableCellPm[] };
type NativeTablePm = { type?: string; content?: TableRowPm[] };
type DocTablePmNode = {
  attrs: { blockId: string; caption: string; note: string };
  content?: NativeTablePm[];
};

export function tableBlockToProseMirror(block: TableBlock): {
  type: string;
  attrs: { blockId: string; caption: string; note: string };
  content: NativeTablePm[];
} {
  return {
    type: "docTable",
    attrs: {
      blockId: block.id,
      caption: block.caption ?? "",
      note: block.note ?? "",
    },
    content: [tableBlockToTipTapTableContent(block)],
  };
}

function cellText(cell: TableCellPm): string {
  const paragraphs = cell.content ?? [];
  return paragraphs
    .flatMap((p) => ((p as { content?: { text?: string }[] }).content ?? []))
    .map((inline) => inline.text ?? "")
    .join("");
}

export function proseMirrorToTableBlock(node: DocTablePmNode): TableBlock {
  const table = (node.content ?? [])[0];
  const rows = table?.content ?? [];
  const [headerRow, ...bodyRows] = rows;
  const headerCells = headerRow?.content ?? [];

  const columns: TableColumn[] = headerCells.map((hc) => {
    const align = (hc.attrs?.["align"] as TableColumnAlign) ?? "left";
    const width = widthFromHeaderAttrs(hc.attrs);
    return {
      header: cellText(hc),
      align,
      ...(width ? { width } : {}),
    };
  });

  const blockRows: TableBlockRow[] = bodyRows.map((row) => ({
    cells: (row.content ?? []).map((cell) => ({
      type: "doc" as const,
      content: cell.content ?? [{ type: "paragraph", content: [] }],
    })),
  }));

  return {
    id: node.attrs.blockId,
    type: "table",
    columns,
    rows: blockRows,
    ...(node.attrs.caption ? { caption: node.attrs.caption } : {}),
    ...(node.attrs.note ? { note: node.attrs.note } : {}),
  };
}

// Width reconciliation between the schema `width` string and TipTap's native
// column-resize attr. TipTap writes pixel widths to `colwidth` (number[]) when
// the user drags a column border; our `colWidth` string preserves the original
// value (e.g. a "30%" from a template) until it's resized.
function widthFromHeaderAttrs(attrs: Record<string, unknown> | undefined): string | undefined {
  const colwidth = attrs?.["colwidth"];
  if (Array.isArray(colwidth) && typeof colwidth[0] === "number" && colwidth[0] > 0) {
    return `${colwidth[0]}px`;
  }
  const colWidth = attrs?.["colWidth"];
  return typeof colWidth === "string" && colWidth.length > 0 ? colWidth : undefined;
}

function widthToHeaderAttrs(
  width: string | undefined,
): { colWidth: string | null; colwidth: number[] | null } {
  if (width === undefined) return { colWidth: null, colwidth: null };
  const px = /^(\d+)(?:px)?$/u.exec(width);
  // Pixel widths drive TipTap's resize colgroup directly; non-px (e.g. "%")
  // is preserved in colWidth and applied by the renderer's colgroup.
  return px ? { colWidth: null, colwidth: [Number(px[1])] } : { colWidth: width, colwidth: null };
}

/** Native TipTap table JSON: a header row carrying column metadata, then body rows. */
export function tableBlockToTipTapTableContent(block: TableBlock): JSONContent {
  const headerRow: JSONContent = {
    type: "tableRow",
    content: block.columns.map((col) => ({
      type: "tableHeader",
      attrs: { align: col.align, ...widthToHeaderAttrs(col.width) },
      content: [
        {
          type: "paragraph",
          content: col.header ? [{ type: "text", text: col.header }] : [],
        },
      ],
    })),
  };

  const bodyRows: JSONContent[] = block.rows.map((row) => ({
    type: "tableRow",
    content: row.cells.map((cell) => ({
      type: "tableCell",
      content: cell.content as JSONContent[],
    })),
  }));

  return { type: "table", content: [headerRow, ...bodyRows] };
}

// ── Renderer ──────────────────────────────────────────────────────────────
export interface TableProps {
  block: TableBlock;
}

function textAlignForColumn(align: TableColumnAlign): CSSProperties["textAlign"] {
  return align;
}

export const Table: FC<TableProps> = ({ block }) => {
  const brand = useBrandTokens();
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  const headerBg = resolveBrandToken(brand, "colors.semantic.surfaceBackground");
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");

  const tableStyle: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: textPrimary,
    marginBottom: brand.spacing.unit * 3,
  };

  const headerCellStyle = (align: TableColumnAlign): CSSProperties => ({
    padding: `${brand.spacing.unit * 2}px ${brand.spacing.unit * 3}px`,
    border: `1px solid ${borderColor}`,
    backgroundColor: headerBg,
    fontWeight: 600,
    textAlign: textAlignForColumn(align),
  });

  const bodyCellStyle = (align: TableColumnAlign): CSSProperties => ({
    padding: `${brand.spacing.unit * 2}px ${brand.spacing.unit * 3}px`,
    border: `1px solid ${borderColor}`,
    textAlign: textAlignForColumn(align),
    verticalAlign: "top",
  });

  const rowStyle: CSSProperties = {
    breakInside: "avoid",
    pageBreakInside: "avoid",
  };

  const captionStyle: CSSProperties = {
    captionSide: "bottom",
    marginTop: brand.spacing.unit * 2,
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    textAlign: "left",
  };

  return (
    <figure
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="table"
      style={{ margin: 0 }}
    >
      <table style={tableStyle}>
        {block.columns.some((col) => col.width) ? (
          <colgroup>
            {block.columns.map((col, index) => (
              <col
                key={index}
                style={col.width ? { width: col.width } : undefined}
              />
            ))}
          </colgroup>
        ) : null}
        <thead>
          <tr style={rowStyle}>
            {block.columns.map((col, index) => (
              <th key={index} style={headerCellStyle(col.align)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex} style={rowStyle}>
              {row.cells.map((cell, cellIndex) => {
                const align =
                  block.columns[cellIndex]?.align ?? ("left" as const);
                return (
                  <td key={cellIndex} style={bodyCellStyle(align)}>
                    <ProseRenderer fragment={cell} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {block.caption ? (
        <figcaption style={captionStyle}>{block.caption}</figcaption>
      ) : null}
    </figure>
  );
};

// ── Registry manifest ─────────────────────────────────────────────────────
const tableBlock = defineBlock<TableBlock>({
  schemaName: "table",
  // Cast: schema._input allows undefined for .default() fields; _output matches TBlock
  schema: TableBlockDataSchema as ZodType<TableBlock>,
  allowedAttrs: ["columns", "rows", "caption", "note"] as const,
  paletteLabel: "Table",
  tiptapNode: DocTableTipTapNode,
  renderer: Table as ComponentType<{ block: TableBlock }>,
  toPm: (block) => tableBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToTableBlock(
      node as unknown as Parameters<typeof proseMirrorToTableBlock>[0],
    ),
});

export default tableBlock;

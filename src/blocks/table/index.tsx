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
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
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
const ConstrainedTableCell = TipTapTableCell.extend({
  content: "paragraph+",
});

/**
 * TipTap table kit with paragraph-only cell content.
 * Used when embedding editable grids inside the doc-table block node view.
 */
export function tableBlockEditorExtensions() {
  return [
    TipTapTable.configure({
      resizable: false,
      HTMLAttributes: { class: "doc-table-grid" },
    }),
    TipTapTableRow,
    TipTapTableHeader,
    ConstrainedTableCell,
  ];
}

// ── TipTap node ───────────────────────────────────────────────────────────
export const DocTableTipTapNode = Node.create({
  name: "docTable",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      columns: {
        default: [],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-columns");
          if (!raw) {
            return [] as TableColumn[];
          }
          return JSON.parse(raw) as TableColumn[];
        },
        renderHTML: (attrs: { columns: TableColumn[] }) => ({
          "data-columns": JSON.stringify(attrs.columns),
        }),
      },
      rows: {
        default: [],
        parseHTML: (el) => {
          const raw = el.getAttribute("data-rows");
          if (!raw) {
            return [] as TableBlockRow[];
          }
          return JSON.parse(raw) as TableBlockRow[];
        },
        renderHTML: (attrs: { rows: TableBlockRow[] }) => ({
          "data-rows": JSON.stringify(attrs.rows),
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
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-block-type": "table" }),
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
          const rows = attrs.rows ?? [
            {
              cells: columns.map(() => emptyTableCell()),
            },
          ];
          return commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              columns,
              rows,
              caption: attrs.caption ?? "",
              note: "",
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocTableNodeView);
  },
});

// ── NodeView (editor) ─────────────────────────────────────────────────────
const DocTableNodeView: FC<NodeViewProps> = ({ node }) => {
  const columns = node.attrs.columns as TableColumn[];
  const rows = node.attrs.rows as TableBlockRow[];

  return (
    <NodeViewWrapper className="doc-table-node-view">
      <span>
        Table ({columns.length}×{rows.length})
      </span>
    </NodeViewWrapper>
  );
};

// ── PM helpers ────────────────────────────────────────────────────────────
type DocTablePmNode = {
  attrs: {
    blockId: string;
    columns: TableColumn[];
    rows: TableBlockRow[];
    caption: string;
    note: string;
  };
};

export function tableBlockToProseMirror(block: TableBlock): {
  type: string;
  attrs: DocTablePmNode["attrs"];
} {
  return {
    type: "docTable",
    attrs: {
      blockId: block.id,
      columns: block.columns,
      rows: block.rows,
      caption: block.caption ?? "",
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToTableBlock(node: DocTablePmNode): TableBlock {
  return {
    id: node.attrs.blockId,
    type: "table",
    columns: node.attrs.columns,
    rows: node.attrs.rows,
    caption: node.attrs.caption || undefined,
    note: node.attrs.note || undefined,
  };
}

/** Nested TipTap table JSON for editors that mount `tableBlockEditorExtensions()`. */
export function tableBlockToTipTapTableContent(block: TableBlock): {
  type: "table";
  content: Array<{
    type: "tableRow";
    content: Array<{
      type: "tableHeader" | "tableCell";
      content: ProseMirrorFragment["content"];
    }>;
  }>;
} {
  const headerRow = {
    type: "tableRow" as const,
    content: block.columns.map((col) => ({
      type: "tableHeader" as const,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: col.header }],
        },
      ],
    })),
  };

  const bodyRows = block.rows.map((row) => ({
    type: "tableRow" as const,
    content: row.cells.map((cell) => ({
      type: "tableCell" as const,
      content: cell.content,
    })),
  }));

  return {
    type: "table",
    content: [headerRow, ...bodyRows],
  };
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

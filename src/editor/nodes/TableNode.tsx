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
import type { FC } from "react";
import type { ProseMirrorFragment } from "../../schema/prosemirror-fragment";
import {
  defaultTableBlock,
  emptyTableCell,
  type TableBlock,
  type TableColumn,
  type TableRow as TableBlockRow,
} from "../../schema/blocks/table";

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

export { defaultTableBlock };

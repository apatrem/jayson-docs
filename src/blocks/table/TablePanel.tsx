import { type FC } from "react";
import type { BlockPanelProps } from "../defineBlock";
import {
  PanelShell,
  Field,
  usePanelDraft,
  fragmentToPlainText,
} from "../panel-kit";
import {
  TableBlockSchema,
  emptyTableCell,
  type TableBlock,
  type TableColumn,
  type TableColumnAlign,
  type TableRow as TableBlockRow,
} from "./schema";

const ALIGNS: TableColumnAlign[] = ["left", "center", "right"];
const MAX_COLS = 8;
const MIN_COLS = 2;
const MAX_ROWS = 30;

export const TablePanel: FC<BlockPanelProps<TableBlock>> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const { draft, errors, update } = usePanelDraft(
    block,
    TableBlockSchema,
    onUpdate,
  );

  const setColumn = (i: number, patch: Partial<TableColumn>): void =>
    update({
      ...draft,
      columns: draft.columns.map((c, idx) =>
        idx === i ? { ...c, ...patch } : c,
      ),
    });

  const setCell = (rowIdx: number, colIdx: number, text: string): void =>
    update({
      ...draft,
      rows: draft.rows.map((row, r) =>
        r === rowIdx
          ? {
              ...row,
              cells: row.cells.map((cell, c) =>
                c === colIdx ? emptyTableCell(text) : cell,
              ),
            }
          : row,
      ),
    });

  const addColumn = (): void =>
    update({
      ...draft,
      columns: [...draft.columns, { header: "Column", align: "left" }],
      rows: draft.rows.map((row) => ({
        ...row,
        cells: [...row.cells, emptyTableCell("")],
      })),
    });

  const removeColumn = (i: number): void =>
    update({
      ...draft,
      columns: draft.columns.filter((_, idx) => idx !== i),
      rows: draft.rows.map((row) => ({
        ...row,
        cells: row.cells.filter((_, idx) => idx !== i),
      })),
    });

  const addRow = (): void =>
    update({
      ...draft,
      rows: [
        ...draft.rows,
        { cells: draft.columns.map(() => emptyTableCell("")) } as TableBlockRow,
      ],
    });

  return (
    <PanelShell title="Table" onClose={onClose} width={460}>
      <Field label="Caption" error={errors["caption"]}>
        <input
          type="text"
          value={draft.caption ?? ""}
          onChange={(e) =>
            update({ ...draft, caption: e.target.value || undefined })
          }
        />
      </Field>

      <Field label="Columns">
        <div style={{ display: "grid", gap: 6 }}>
          {draft.columns.map((col, i) => (
            <div key={i} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="text"
                value={col.header}
                style={{ flex: 1 }}
                onChange={(e) => setColumn(i, { header: e.target.value })}
              />
              <select
                value={col.align}
                onChange={(e) =>
                  setColumn(i, { align: e.target.value as TableColumnAlign })
                }
              >
                {ALIGNS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              {draft.columns.length > MIN_COLS && (
                <button type="button" onClick={() => removeColumn(i)} aria-label={`Remove column ${i + 1}`}>
                  ×
                </button>
              )}
            </div>
          ))}
          {draft.columns.length < MAX_COLS && (
            <button type="button" onClick={addColumn}>
              Add column
            </button>
          )}
        </div>
      </Field>

      <Field label="Rows">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {draft.columns.map((col, i) => (
                <th
                  key={i}
                  style={{ border: "1px solid #E2E8F0", padding: 4, textAlign: "left" }}
                >
                  {col.header}
                </th>
              ))}
              <th style={{ width: 28 }} />
            </tr>
          </thead>
          <tbody>
            {draft.rows.map((row, r) => (
              <tr key={r}>
                {row.cells.map((cell, c) => (
                  <td key={c} style={{ border: "1px solid #E2E8F0", padding: 0 }}>
                    <input
                      type="text"
                      value={fragmentToPlainText(cell)}
                      style={{ width: "100%", border: "none", padding: 4 }}
                      onChange={(e) => setCell(r, c, e.target.value)}
                    />
                  </td>
                ))}
                <td style={{ textAlign: "center" }}>
                  {draft.rows.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove row ${r + 1}`}
                      onClick={() =>
                        update({
                          ...draft,
                          rows: draft.rows.filter((_, idx) => idx !== r),
                        })
                      }
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {draft.rows.length < MAX_ROWS && (
          <button type="button" style={{ marginTop: 6 }} onClick={addRow}>
            Add row
          </button>
        )}
      </Field>
    </PanelShell>
  );
};

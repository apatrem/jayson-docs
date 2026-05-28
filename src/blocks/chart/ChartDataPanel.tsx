/**
 * src/blocks/chart/ChartDataPanel.tsx — Chart side panel (D-24 decision).
 *
 * When a chart block is selected in the editor, this panel opens on the
 * right side of the screen. Moved from src/editor/panels/ChartDataPanel.tsx
 * as part of T-156 (chart block co-location).
 */

import {
  useCallback,
  useMemo,
  useState,
  type FC,
  type ReactNode,
  type CSSProperties,
  type ClipboardEvent,
} from "react";
import {
  ChartBlockSchema,
  type ChartBlock,
  type ChartType,
} from "./schema";

export interface ChartDataPanelProps {
  block: ChartBlock;
  onUpdate: (next: ChartBlock) => void;
  onClose: () => void;
}

export const ChartDataPanel: FC<ChartDataPanelProps> = ({
  block,
  onUpdate,
  onClose,
}) => {
  // Local working copy — edits commit on blur or after a validation pass.
  const [draft, setDraft] = useState<ChartBlock>(block);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const commit = useCallback(
    (next: ChartBlock) => {
      const result = ChartBlockSchema.safeParse(next);
      if (!result.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          nextErrors[issue.path.join(".")] = issue.message;
        }
        setErrors(nextErrors);
        setDraft(next);                    // keep the bad state visible
        return;
      }
      setErrors({});
      setDraft(next);
      onUpdate(next);
    },
    [onUpdate],
  );

  const updateField = useCallback(
    <K extends keyof ChartBlock>(key: K, value: ChartBlock[K]) => {
      commit({ ...draft, [key]: value });
    },
    [commit, draft],
  );

  return (
    <aside
      role="dialog"
      aria-label="Chart editor"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: 420,
        background: "var(--surface, #FFFFFF)",
        borderLeft: "1px solid var(--border, #E2E8F0)",
        padding: 16,
        overflowY: "auto",
        zIndex: 100,
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Chart</h2>
        <button onClick={onClose} aria-label="Close chart editor">×</button>
      </header>

      {/* Chart type */}
      <Field label="Type">
        <select
          value={draft.chartType}
          onChange={(e) => updateField("chartType", e.target.value as ChartType)}
        >
          {(["bar", "stacked-bar", "line", "area", "pie", "donut",
             "scatter", "waterfall", "mekko"] as ChartType[]).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Field>

      {/* Title */}
      <Field
        label="Title"
        {...(errors["title"] ? { error: errors["title"] } : {})}
      >
        <input
          type="text"
          value={draft.title}
          onChange={(e) => updateField("title", e.target.value)}
          maxLength={120}
        />
      </Field>

      {/* Takeaway */}
      <Field
        label="Takeaway (the 'so what')"
        {...(errors["takeaway"] ? { error: errors["takeaway"] } : {})}
      >
        <textarea
          rows={2}
          value={draft.takeaway ?? ""}
          onChange={(e) =>
            updateField("takeaway", e.target.value || undefined)
          }
          maxLength={200}
        />
      </Field>

      {/* Axis labels */}
      <Field label="X axis title">
        <input
          type="text"
          value={draft.axes?.xTitle ?? ""}
          onChange={(e) => updateField("axes", { ...draft.axes, xTitle: e.target.value || undefined })}
        />
      </Field>
      <Field label="Y axis title">
        <input
          type="text"
          value={draft.axes?.yTitle ?? ""}
          onChange={(e) => updateField("axes", { ...draft.axes, yTitle: e.target.value || undefined })}
        />
      </Field>
      <Field label="Unit (e.g. €M, %, FTE)">
        <input
          type="text"
          value={draft.data.unit ?? ""}
          onChange={(e) =>
            updateField("data", { ...draft.data, unit: e.target.value || undefined })
          }
          maxLength={20}
        />
      </Field>

      {/* Data grid */}
      <Field label="Data" hint="Paste from Excel/Sheets to fill the grid">
        <ChartDataGrid
          data={draft.data}
          onChange={(data) => updateField("data", data)}
        />
      </Field>

      {/* Palette + display options */}
      <Field label="Palette">
        <label style={{ marginRight: 12 }}>
          <input
            type="radio"
            checked={draft.palette === "qualitative"}
            onChange={() => updateField("palette", "qualitative")}
          />{" "}
          qualitative
        </label>
        <label>
          <input
            type="radio"
            checked={draft.palette === "sequential"}
            onChange={() => updateField("palette", "sequential")}
          />{" "}
          sequential
        </label>
      </Field>
      <Field>
        <label>
          <input
            type="checkbox"
            checked={draft.showLegend}
            onChange={(e) => updateField("showLegend", e.target.checked)}
          />{" "}
          Show legend
        </label>
      </Field>
      <Field label="Legend position">
        <select
          value={draft.legendPosition}
          disabled={!draft.showLegend}
          onChange={(e) =>
            updateField(
              "legendPosition",
              e.target.value as ChartBlock["legendPosition"],
            )
          }
        >
          <option value="bottom">Bottom</option>
          <option value="right">Right</option>
          <option value="top">Top</option>
        </select>
      </Field>
      <Field>
        <label>
          <input
            type="checkbox"
            checked={draft.showDataLabels}
            onChange={(e) => updateField("showDataLabels", e.target.checked)}
          />{" "}
          Show data labels
        </label>
      </Field>
    </aside>
  );
};

// ── Field wrapper ─────────────────────────────────────────────────────────────

const Field: FC<{
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}> = ({ label, hint, error, children }) => (
  <div style={{ marginTop: 12 }}>
    {label && (
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{label}</div>
    )}
    {children}
    {hint && !error && (
      <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{hint}</div>
    )}
    {error && (
      <div style={{ fontSize: 10, color: "#B91C1C", marginTop: 2 }} role="alert">
        {error}
      </div>
    )}
  </div>
);

// ── Data grid + Excel paste ───────────────────────────────────────────────────

interface ChartDataGridProps {
  data: ChartBlock["data"];
  onChange: (next: ChartBlock["data"]) => void;
}

const ChartDataGrid: FC<ChartDataGridProps> = ({ data, onChange }) => {
  const seriesCount = data.series.length;
  const rowCount = useMemo(() => {
    return Math.max(data.xLabels?.length ?? 0, ...data.series.map((s) => s.values.length));
  }, [data]);

  const updateCell = (rowI: number, colI: number, raw: string) => {
    const n = Number(raw);
    if (raw !== "" && Number.isNaN(n)) return;
    const nextSeries = data.series.map((s, i) => {
      if (i !== colI) return s;
      const nextValues = [...s.values];
      nextValues[rowI] = raw === "" ? 0 : n;
      return { ...s, values: nextValues };
    });
    onChange({ ...data, series: nextSeries });
  };

  const updateLabel = (rowI: number, raw: string) => {
    const labels = [...(data.xLabels ?? [])];
    labels[rowI] = raw;
    onChange({ ...data, xLabels: labels });
  };

  const updateSeriesName = (colI: number, raw: string) => {
    const nextSeries = data.series.map((s, i) => (i === colI ? { ...s, name: raw } : s));
    onChange({ ...data, series: nextSeries });
  };

  // Schema allows 1–8 series. Add a zero-filled series sized to the current rows.
  const MAX_SERIES = 8;
  const addSeries = () => {
    if (data.series.length >= MAX_SERIES) return;
    const values = Array.from({ length: Math.max(rowCount, 1) }, () => 0);
    onChange({
      ...data,
      series: [...data.series, { name: `Series ${data.series.length + 1}`, values }],
    });
  };

  const removeSeries = (colI: number) => {
    if (data.series.length <= 1) return;
    onChange({ ...data, series: data.series.filter((_, i) => i !== colI) });
  };

  const addRow = () => {
    onChange({
      ...data,
      xLabels: [...(data.xLabels ?? []), ""],
      series: data.series.map((s) => ({ ...s, values: [...s.values, 0] })),
    });
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData("text/plain").trim();
    if (!text) return;
    const delim = text.includes("\t") ? "\t" : ",";
    const rows = text.split(/\r?\n/).map((r) => r.split(delim));
    if (rows.length < 2) return;

    e.preventDefault();

    const [header, ...body] = rows;
    if (!header || !body[0]) return;
    const xLabels = body.map((r) => r[0] ?? "");
    const seriesCount = header.length - 1;
    const series = Array.from({ length: seriesCount }, (_, colI) => ({
      name: header[colI + 1]?.trim() || `Series ${colI + 1}`,
      values: body.map((r) => Number(r[colI + 1]) || 0),
    }));
    onChange({ ...data, xLabels, series });
  };

  return (
    <div onPaste={handlePaste} tabIndex={0} style={{ outline: "none" }}>
      {/* Horizontal scroll so many series don't overflow the fixed-width panel;
          fixed layout + border-box inputs keep the name fields from spilling. */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{ fontSize: 11, borderCollapse: "collapse", tableLayout: "fixed", width: "100%" }}
        >
          <thead>
            <tr>
              <th style={th()}>Label</th>
              {data.series.map((s, i) => (
                <th key={i} style={th()}>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <input
                      type="text"
                      aria-label={`Series ${i + 1} name`}
                      value={s.name}
                      onChange={(e) => updateSeriesName(i, e.target.value)}
                      style={{ width: "100%", minWidth: 0, boxSizing: "border-box", fontWeight: 600 }}
                    />
                    {data.series.length > 1 ? (
                      <button
                        type="button"
                        aria-label={`Remove series ${i + 1}`}
                        onClick={() => removeSeries(i)}
                        style={removeBtn()}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, rowI) => (
              <tr key={rowI}>
                <td style={td()}>
                  <input
                    type="text"
                    value={data.xLabels?.[rowI] ?? ""}
                    onChange={(e) => updateLabel(rowI, e.target.value)}
                    style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}
                  />
                </td>
                {Array.from({ length: seriesCount }, (_, colI) => (
                  <td key={colI} style={td()}>
                    <input
                      type="number"
                      value={data.series[colI]?.values[rowI] ?? ""}
                      onChange={(e) => updateCell(rowI, colI, e.target.value)}
                      style={{ width: "100%", minWidth: 0, boxSizing: "border-box", textAlign: "right" }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={addSeries}
          disabled={data.series.length >= MAX_SERIES}
          style={gridActionBtn()}
        >
          + Add series
        </button>
        <button type="button" onClick={addRow} style={gridActionBtn()}>
          + Add row
        </button>
      </div>
    </div>
  );
};

const removeBtn = (): CSSProperties => ({
  appearance: "none",
  border: "none",
  background: "transparent",
  color: "#94A3B8",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: 1,
  padding: "0 2px",
});

const gridActionBtn = (): CSSProperties => ({
  appearance: "none",
  border: "1px solid #D6DEE8",
  background: "#FFFFFF",
  color: "#0B3D91",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  padding: "4px 10px",
  cursor: "pointer",
});

const th = (): CSSProperties => ({
  border: "1px solid #E2E8F0",
  padding: 4,
  background: "#F8FAFC",
  textAlign: "left",
});

const td = (): CSSProperties => ({
  border: "1px solid #E2E8F0",
  padding: 0,
});

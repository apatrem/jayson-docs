import type { CSSProperties, FC } from "react";
import type { CostLedgerRow } from "../../cost-ledger/db";
import type { CostSummary } from "../../cost-ledger/limits";

export interface CostLedgerViewProps {
  rows: CostLedgerRow[];
  summary: CostSummary;
  onClearHistory: () => void | Promise<void>;
  confirmClear?: (message: string) => boolean;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export const CostLedgerView: FC<CostLedgerViewProps> = ({
  rows,
  summary,
  onClearHistory,
  confirmClear = defaultConfirm,
}) => {
  const handleClear = () => {
    if (
      confirmClear(
        "Clear all local LLM cost history? This also resets the current monthly quota.",
      )
    ) {
      void onClearHistory();
    }
  };

  return (
    <section style={styles.panel} aria-labelledby="llm-spend-title">
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Settings</p>
          <h1 id="llm-spend-title" style={styles.title}>
            My LLM Spend
          </h1>
          <p style={styles.description}>
            Local cost rows used only for monthly spend limits. Prompt and
            response content are never stored here.
          </p>
        </div>
        <button
          type="button"
          style={styles.clearButton}
          onClick={handleClear}
          disabled={rows.length === 0}
        >
          Clear all cost history
        </button>
      </header>

      <div style={styles.cards} aria-label="Spend aggregates">
        <MetricCard
          label="Current month"
          value={money.format(summary.currentMonth.totalUsd)}
          detail={`${summary.currentMonth.callCount} calls · ${formatPercent(
            summary.currentMonth.pctOfLimit,
          )} of ${money.format(summary.currentMonth.limitUsd)} limit`}
        />
        <MetricCard
          label="Rolling 30 days"
          value={money.format(summary.rolling30Days.totalUsd)}
          detail={`${summary.rolling30Days.callCount} calls`}
        />
        <MetricCard
          label="Documents"
          value={String(summary.perDoc.length)}
          detail="with recorded LLM cost"
        />
      </div>

      <section style={styles.section} aria-labelledby="per-doc-title">
        <h2 id="per-doc-title" style={styles.sectionTitle}>
          Per-doc breakdown
        </h2>
        {summary.perDoc.length === 0 ? (
          <p style={styles.muted}>No document-specific costs recorded yet.</p>
        ) : (
          <ul style={styles.docList}>
            {summary.perDoc.map((doc) => (
              <li key={doc.docId} style={styles.docRow}>
                <span style={styles.mono}>{doc.docId}</span>
                <span>
                  {money.format(doc.totalUsd)} · {doc.callCount} calls
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={styles.section} aria-labelledby="ledger-table-title">
        <h2 id="ledger-table-title" style={styles.sectionTitle}>
          Cost rows
        </h2>
        {rows.length === 0 ? (
          <p role="status" style={styles.muted}>
            No LLM cost rows have been recorded.
          </p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <Th>Timestamp</Th>
                  <Th>Provider / model</Th>
                  <Th>Call kind</Th>
                  <Th>Tokens</Th>
                  <Th>Cost</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <Td>{formatDate(row.timestamp)}</Td>
                    <Td>
                      <span style={styles.mono}>{row.provider}</span> /{" "}
                      {row.model}
                    </Td>
                    <Td>{row.callKind}</Td>
                    <Td>
                      {row.inputTokens + row.outputTokens} total
                      {row.cachedTokens > 0
                        ? ` · ${row.cachedTokens} cached`
                        : ""}
                    </Td>
                    <Td>{money.format(row.computedCostUsd)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
};

const MetricCard: FC<{ label: string; value: string; detail: string }> = ({
  label,
  value,
  detail,
}) => (
  <article style={styles.card}>
    <p style={styles.metricLabel}>{label}</p>
    <p style={styles.metricValue}>{value}</p>
    <p style={styles.muted}>{detail}</p>
  </article>
);

const Th: FC<{ children: string }> = ({ children }) => (
  <th scope="col" style={styles.th}>
    {children}
  </th>
);

const Td: FC<{ children: React.ReactNode }> = ({ children }) => (
  <td style={styles.td}>{children}</td>
);

function defaultConfirm(message: string): boolean {
  return window.confirm(message);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDate(timestamp: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

const styles: Record<string, CSSProperties> = {
  panel: {
    color: "CanvasText",
    backgroundColor: "Canvas",
    display: "grid",
    gap: "1.5rem",
    padding: "1.5rem",
  },
  header: {
    alignItems: "flex-start",
    display: "flex",
    gap: "1rem",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: "0.75rem",
    letterSpacing: "0.08em",
    margin: 0,
    textTransform: "uppercase",
  },
  title: {
    fontSize: "1.75rem",
    lineHeight: 1.2,
    margin: "0.25rem 0",
  },
  description: {
    margin: 0,
    maxWidth: "42rem",
  },
  clearButton: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.375rem",
    cursor: "pointer",
    padding: "0.5rem 0.75rem",
  },
  cards: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
  },
  card: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    padding: "1rem",
  },
  metricLabel: {
    margin: 0,
  },
  metricValue: {
    fontSize: "1.5rem",
    fontWeight: 700,
    margin: "0.25rem 0",
  },
  muted: {
    color: "GrayText",
    margin: 0,
  },
  section: {
    display: "grid",
    gap: "0.75rem",
  },
  sectionTitle: {
    fontSize: "1rem",
    margin: 0,
  },
  docList: {
    display: "grid",
    gap: "0.5rem",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  docRow: {
    alignItems: "center",
    borderBottom: "1px solid ButtonBorder",
    display: "flex",
    gap: "1rem",
    justifyContent: "space-between",
    padding: "0.5rem 0",
  },
  mono: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    borderCollapse: "collapse",
    minWidth: "48rem",
    width: "100%",
  },
  th: {
    borderBottom: "1px solid ButtonBorder",
    fontWeight: 700,
    padding: "0.5rem",
    textAlign: "left",
  },
  td: {
    borderBottom: "1px solid ButtonBorder",
    padding: "0.5rem",
    verticalAlign: "top",
  },
};

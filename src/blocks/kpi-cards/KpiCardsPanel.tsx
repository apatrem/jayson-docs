/**
 * src/blocks/kpi-cards/KpiCardsPanel.tsx — KPI-cards side panel.
 *
 * When a kpi-cards block is selected in the editor, this panel opens on the
 * right side of the screen. Mirrors ChartDataPanel's shape so DocumentView
 * can mount whichever panel matches the selected block type.
 *
 * Extracted from the inline form previously rendered inside KpiCardsNodeView
 * (P0b — kpi-cards extraction); the NodeView now renders only the visual.
 */

import {
  useCallback,
  useState,
  type CSSProperties,
  type FC,
  type ReactNode,
} from "react";
import {
  KpiCardsBlockSchema,
  defaultKpiCard,
  type KpiCard,
  type KpiCardsBlock,
  type KpiEmphasis,
  type KpiTrend,
} from "./schema";

export interface KpiCardsPanelProps {
  block: KpiCardsBlock;
  onUpdate: (next: KpiCardsBlock) => void;
  onClose: () => void;
}

const MAX_CARDS = 4;

export const KpiCardsPanel: FC<KpiCardsPanelProps> = ({
  block,
  onUpdate,
  onClose,
}) => {
  const [draft, setDraft] = useState<KpiCardsBlock>(block);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const commit = useCallback(
    (next: KpiCardsBlock) => {
      const result = KpiCardsBlockSchema.safeParse(next);
      if (!result.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          nextErrors[issue.path.join(".")] = issue.message;
        }
        setErrors(nextErrors);
        setDraft(next);
        return;
      }
      setErrors({});
      setDraft(next);
      onUpdate(next);
    },
    [onUpdate],
  );

  const updateCard = useCallback(
    (index: number, patch: Partial<KpiCard>): void => {
      commit({
        ...draft,
        cards: draft.cards.map((card, cardIndex) =>
          cardIndex === index ? { ...card, ...patch } : card,
        ),
      });
    },
    [commit, draft],
  );

  const removeCard = useCallback(
    (index: number): void => {
      commit({
        ...draft,
        cards: draft.cards.filter((_, cardIndex) => cardIndex !== index),
      });
    },
    [commit, draft],
  );

  const addCard = useCallback(() => {
    commit({ ...draft, cards: [...draft.cards, defaultKpiCard()] });
  }, [commit, draft]);

  return (
    <aside
      role="dialog"
      aria-label="KPI cards editor"
      style={asideStyle}
    >
      <header style={headerStyle}>
        <h2 style={titleStyle}>KPI Cards</h2>
        <button onClick={onClose} aria-label="Close KPI cards editor">×</button>
      </header>

      {draft.cards.map((card, index) => (
        <fieldset key={index} style={cardFieldStyle}>
          <legend style={{ fontSize: 12, fontWeight: 600 }}>
            Card {index + 1}
          </legend>

          <Field
            label="Value"
            {...(errors[`cards.${index}.value`]
              ? { error: errors[`cards.${index}.value`] }
              : {})}
          >
            <input
              type="text"
              value={card.value}
              onChange={(event) =>
                updateCard(index, { value: event.target.value })
              }
            />
          </Field>

          <Field
            label="Label"
            {...(errors[`cards.${index}.label`]
              ? { error: errors[`cards.${index}.label`] }
              : {})}
          >
            <input
              type="text"
              value={card.label}
              maxLength={60}
              onChange={(event) =>
                updateCard(index, { label: event.target.value })
              }
            />
          </Field>

          <Field label="Sublabel">
            <input
              type="text"
              value={card.sublabel ?? ""}
              maxLength={80}
              onChange={(event) =>
                updateCard(index, {
                  sublabel: event.target.value || undefined,
                })
              }
            />
          </Field>

          <Field label="Trend">
            <select
              value={card.trend ?? "none"}
              onChange={(event) =>
                updateCard(index, { trend: event.target.value as KpiTrend })
              }
            >
              <option value="none">None</option>
              <option value="up">Up</option>
              <option value="down">Down</option>
              <option value="flat">Flat</option>
            </select>
          </Field>

          <Field label="Emphasis">
            <select
              value={card.emphasis ?? "neutral"}
              onChange={(event) =>
                updateCard(index, {
                  emphasis: event.target.value as KpiEmphasis,
                })
              }
            >
              <option value="neutral">Neutral</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="brand">Brand</option>
            </select>
          </Field>

          {draft.cards.length > 1 ? (
            <button type="button" onClick={() => removeCard(index)}>
              Remove card
            </button>
          ) : null}
        </fieldset>
      ))}

      {draft.cards.length < MAX_CARDS ? (
        <button type="button" onClick={addCard} style={{ marginTop: 12 }}>
          Add card
        </button>
      ) : null}
    </aside>
  );
};

// ── Field wrapper ────────────────────────────────────────────────────────────
const Field: FC<{
  label?: string;
  error?: string;
  children: ReactNode;
}> = ({ label, error, children }) => (
  <div style={{ marginTop: 8 }}>
    {label && (
      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
    )}
    {children}
    {error && (
      <div
        style={{ fontSize: 10, color: "#B91C1C", marginTop: 2 }}
        role="alert"
      >
        {error}
      </div>
    )}
  </div>
);

const asideStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: 360,
  background: "var(--surface, #FFFFFF)",
  borderLeft: "1px solid var(--border, #E2E8F0)",
  padding: 16,
  overflowY: "auto",
  zIndex: 100,
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
};

const cardFieldStyle: CSSProperties = {
  border: "1px solid var(--border, #E2E8F0)",
  borderRadius: "0.375rem",
  display: "grid",
  gap: "0.5rem",
  margin: "12px 0 0 0",
  padding: "0.625rem",
};

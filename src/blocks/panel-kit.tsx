/**
 * src/blocks/panel-kit.tsx — shared building blocks for structured-block side
 * panels.
 *
 * A panel opens on the right edge of the editor when its block is selected and
 * edits the block's attrs-backed fields through a form. Rich-text fields
 * (list-item text, table cells) are edited here as PLAIN TEXT — inline
 * formatting within those fields is not panel-editable in v1.
 *
 * Every panel:
 *   - wraps its form in <PanelShell title onClose>
 *   - uses usePanelDraft(block, schema, onUpdate) for validated draft state
 *   - lays fields out with <Field label>
 */

import {
  useCallback,
  useState,
  type CSSProperties,
  type FC,
  type ReactNode,
} from "react";
import type { ZodType, ZodTypeDef } from "zod";

// ── Draft hook ───────────────────────────────────────────────────────────────

export interface PanelDraft<T> {
  draft: T;
  errors: Record<string, string>;
  /** Validate `next` against the schema; commit to the editor only when valid. */
  update: (next: T) => void;
}

export function usePanelDraft<T>(
  block: T,
  // Input type is `unknown` so schemas with `.default()` fields (whose input
  // type differs from their output type T) are still assignable here.
  schema: ZodType<T, ZodTypeDef, unknown>,
  onUpdate: (next: T) => void,
): PanelDraft<T> {
  const [draft, setDraft] = useState<T>(block);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = useCallback(
    (next: T) => {
      const result = schema.safeParse(next);
      if (!result.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
          nextErrors[issue.path.join(".")] = issue.message;
        }
        setErrors(nextErrors);
        setDraft(next); // keep the invalid state visible while editing
        return;
      }
      setErrors({});
      setDraft(result.data);
      onUpdate(result.data);
    },
    [schema, onUpdate],
  );

  return { draft, errors, update };
}

// ── Layout primitives ─────────────────────────────────────────────────────────

export const PanelShell: FC<{
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}> = ({ title, onClose, children, width = 360 }) => (
  <aside role="dialog" aria-label={`${title} editor`} style={{ ...asideStyle, width }}>
    <header style={headerStyle}>
      <h2 style={titleStyle}>{title}</h2>
      <button type="button" onClick={onClose} aria-label={`Close ${title} editor`}>
        ×
      </button>
    </header>
    {children}
  </aside>
);

export const Field: FC<{
  label?: string | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}> = ({ label, error, hint, children }) => (
  <div style={{ marginTop: 10 }}>
    {label !== undefined && <div style={fieldLabelStyle}>{label}</div>}
    {children}
    {hint !== undefined && error === undefined && (
      <div style={hintStyle}>{hint}</div>
    )}
    {error !== undefined && (
      <div style={errorStyle} role="alert">
        {error}
      </div>
    )}
  </div>
);

export const FieldGroup: FC<{
  legend: string;
  children: ReactNode;
  onRemove?: (() => void) | undefined;
}> = ({ legend, children, onRemove }) => (
  <fieldset style={fieldsetStyle}>
    <legend style={{ fontSize: 12, fontWeight: 600 }}>{legend}</legend>
    {children}
    {onRemove !== undefined && (
      <button type="button" onClick={onRemove} style={{ marginTop: 6 }}>
        Remove
      </button>
    )}
  </fieldset>
);

// ── Rich-text fragment <-> plain text ──────────────────────────────────────────

export function fragmentToPlainText(fragment: unknown): string {
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (node === null || typeof node !== "object") return;
    const n = node as { text?: unknown; content?: unknown };
    if (typeof n.text === "string") {
      parts.push(n.text);
      return;
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  };
  walk(fragment);
  return parts.join("");
}

export function plainTextToFragment(text: string): {
  type: "doc";
  content: unknown[];
} {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  };
}

// ── Styles ──────────────────────────────────────────────────────────────────

const asideStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
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

const titleStyle: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 600 };

const fieldLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  marginBottom: 4,
};

const hintStyle: CSSProperties = { fontSize: 10, color: "#64748B", marginTop: 2 };

const errorStyle: CSSProperties = { fontSize: 10, color: "#B91C1C", marginTop: 2 };

const fieldsetStyle: CSSProperties = {
  border: "1px solid var(--border, #E2E8F0)",
  borderRadius: "0.375rem",
  display: "grid",
  gap: "0.4rem",
  margin: "12px 0 0 0",
  padding: "0.625rem",
};

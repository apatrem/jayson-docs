import { useState, type CSSProperties, type FC } from "react";
import type { Meta } from "../../schema/meta";
import type { NumberFormat } from "../../schema/numbering";
import {
  DEFAULT_LEVEL_FORMATS,
  DEFAULT_NUMBERING_SEPARATOR,
} from "../../schema/numbering";
import { DEFAULT_BLOCK_SPACING_MULTIPLE } from "../../renderer/block-spacing";

/**
 * "Document settings" dialog (ADR-0018, item 6). Edits the curated metadata
 * fields plus the Layout group (block spacing + heading-numbering format).
 * Layout overrides are written to `meta.layout` only when they differ from the
 * defaults, keeping a clean document free of layout noise.
 */
export interface DocumentSettingsDialogProps {
  meta: Meta;
  onApply: (next: Meta) => void;
  onClose: () => void;
}

const DOC_KINDS: Meta["docKind"][] = ["proposal", "report", "audit", "memo", "deck", "other"];
const LANGUAGES: Meta["language"][] = ["en", "fr"];
const STATUSES: Meta["status"][] = ["draft", "in-review", "sent", "won", "lost", "archived"];
const CONFIDENTIALITY: Meta["confidentialityLevel"][] = ["low", "medium", "high"];
const NUMBER_FORMATS: NumberFormat[] = [
  "decimal",
  "upper-alpha",
  "lower-alpha",
  "upper-roman",
  "lower-roman",
];
const FORMAT_LABEL: Record<NumberFormat, string> = {
  decimal: "1, 2, 3",
  "upper-alpha": "A, B, C",
  "lower-alpha": "a, b, c",
  "upper-roman": "I, II, III",
  "lower-roman": "i, ii, iii",
};

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export const DocumentSettingsDialog: FC<DocumentSettingsDialogProps> = ({
  meta,
  onApply,
  onClose,
}) => {
  const [client, setClient] = useState(meta.client);
  const [project, setProject] = useState(meta.project);
  const [docKind, setDocKind] = useState<Meta["docKind"]>(meta.docKind);
  const [sector, setSector] = useState(meta.sector ?? "");
  const [tags, setTags] = useState(meta.tags.join(", "));
  const [language, setLanguage] = useState<Meta["language"]>(meta.language);
  const [status, setStatus] = useState<Meta["status"]>(meta.status);
  const [confidentiality, setConfidentiality] = useState<Meta["confidentialityLevel"]>(
    meta.confidentialityLevel,
  );
  const [owner, setOwner] = useState(meta.owner);
  const [reviewers, setReviewers] = useState(meta.reviewers.join(", "));

  // Layout group.
  const [blockSpacing, setBlockSpacing] = useState<number>(
    meta.layout?.blockSpacing ?? DEFAULT_BLOCK_SPACING_MULTIPLE,
  );
  const [levelFormats, setLevelFormats] = useState<NumberFormat[]>(
    meta.layout?.numbering?.levelFormats
      ? [...meta.layout.numbering.levelFormats]
      : [...DEFAULT_LEVEL_FORMATS],
  );
  const [separator, setSeparator] = useState<string>(
    meta.layout?.numbering?.separator ?? DEFAULT_NUMBERING_SEPARATOR,
  );

  const setLevelFormat = (index: number, format: NumberFormat): void => {
    setLevelFormats((prev) => prev.map((existing, i) => (i === index ? format : existing)));
  };

  const buildLayout = (): Meta["layout"] => {
    const spacingDiffers = blockSpacing !== DEFAULT_BLOCK_SPACING_MULTIPLE;
    const formatsDiffer = levelFormats.some((f, i) => f !== DEFAULT_LEVEL_FORMATS[i]);
    const separatorDiffers = separator !== DEFAULT_NUMBERING_SEPARATOR;
    const numbering =
      formatsDiffer || separatorDiffers
        ? {
            ...(formatsDiffer ? { levelFormats: [...levelFormats] } : {}),
            ...(separatorDiffers ? { separator } : {}),
          }
        : undefined;
    if (!spacingDiffers && numbering === undefined) {
      return undefined; // all defaults → no layout override
    }
    return {
      ...(spacingDiffers ? { blockSpacing } : {}),
      ...(numbering ? { numbering } : {}),
    };
  };

  const handleApply = (): void => {
    const layout = buildLayout();
    const next: Meta = {
      ...meta,
      client: client.trim(),
      project: project.trim(),
      docKind,
      ...(sector.trim().length > 0 ? { sector: sector.trim() } : {}),
      tags: splitList(tags),
      language,
      status,
      confidentialityLevel: confidentiality,
      owner: owner.trim(),
      reviewers: splitList(reviewers),
      ...(layout ? { layout } : {}),
    };
    if (layout === undefined) {
      delete (next as { layout?: unknown }).layout;
    }
    onApply(next);
  };

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Document settings"
        style={styles.dialog}
      >
        <header style={styles.header}>
          <h2 style={styles.title}>Document settings</h2>
          <button type="button" aria-label="Close document settings" onClick={onClose} style={styles.close}>
            ✕
          </button>
        </header>

        <div style={styles.body}>
          <h3 style={styles.groupTitle}>Metadata</h3>
          <div style={styles.grid}>
            {textField("Client", client, setClient)}
            {textField("Project", project, setProject)}
            {selectField("Type", docKind, DOC_KINDS, (v) => setDocKind(v as Meta["docKind"]))}
            {textField("Sector", sector, setSector)}
            {textField("Tags (comma-separated)", tags, setTags)}
            {selectField("Language", language, LANGUAGES, (v) => setLanguage(v as Meta["language"]))}
            {selectField("Status", status, STATUSES, (v) => setStatus(v as Meta["status"]))}
            {selectField("Confidentiality", confidentiality, CONFIDENTIALITY, (v) =>
              setConfidentiality(v as Meta["confidentialityLevel"]),
            )}
            {textField("Owner (email)", owner, setOwner)}
            {textField("Reviewers (comma-separated)", reviewers, setReviewers)}
          </div>

          <h3 style={styles.groupTitle}>Layout</h3>
          <div style={styles.grid}>
            <label style={styles.field}>
              <span style={styles.label}>
                Block spacing (× base unit, default {DEFAULT_BLOCK_SPACING_MULTIPLE})
              </span>
              <input
                type="number"
                min={0}
                max={40}
                step={0.5}
                value={blockSpacing}
                onChange={(e) => setBlockSpacing(Number(e.target.value))}
                style={styles.input}
              />
            </label>
            <label style={styles.field}>
              <span style={styles.label}>Numbering separator</span>
              <input
                type="text"
                maxLength={3}
                value={separator}
                onChange={(e) => setSeparator(e.target.value)}
                style={styles.input}
              />
            </label>
          </div>
          <div style={styles.grid}>
            {levelFormats.map((format, index) => (
              <label key={index} style={styles.field}>
                <span style={styles.label}>{`Heading level ${index + 1}`}</span>
                <select
                  value={format}
                  onChange={(e) => setLevelFormat(index, e.target.value as NumberFormat)}
                  style={styles.input}
                >
                  {NUMBER_FORMATS.map((f) => (
                    <option key={f} value={f}>
                      {FORMAT_LABEL[f]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>

        <footer style={styles.footer}>
          <button type="button" onClick={onClose} style={styles.secondaryButton}>
            Cancel
          </button>
          <button type="button" onClick={handleApply} style={styles.primaryButton}>
            Apply
          </button>
        </footer>
      </section>
    </>
  );
};

function textField(
  label: string,
  value: string,
  onChange: (v: string) => void,
): JSX.Element {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={styles.input} />
    </label>
  );
}

function selectField(
  label: string,
  value: string,
  options: readonly string[],
  onChange: (v: string) => void,
): JSX.Element {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.input}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)",
    zIndex: 40,
  },
  dialog: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(640px, 92vw)",
    maxHeight: "86vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: 10,
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.3)",
    zIndex: 41,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid rgba(148, 163, 184, 0.3)",
  },
  title: { margin: 0, fontSize: 18, color: "#0f172a" },
  close: {
    border: "none",
    background: "transparent",
    fontSize: 16,
    cursor: "pointer",
    color: "#64748b",
  },
  body: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 },
  groupTitle: {
    margin: "8px 0 4px",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#64748b",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 12, color: "#475569" },
  input: {
    padding: "6px 8px",
    border: "1px solid rgba(148, 163, 184, 0.5)",
    borderRadius: 6,
    fontSize: 13,
    color: "#0f172a",
    background: "#fff",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "14px 20px",
    borderTop: "1px solid rgba(148, 163, 184, 0.3)",
  },
  primaryButton: {
    padding: "8px 16px",
    border: "none",
    borderRadius: 6,
    background: "#2563eb",
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "8px 16px",
    border: "1px solid rgba(148, 163, 184, 0.5)",
    borderRadius: 6,
    background: "#fff",
    color: "#334155",
    fontSize: 13,
    cursor: "pointer",
  },
};

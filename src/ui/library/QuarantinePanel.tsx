/**
 * QuarantinePanel (T-165) — lists blocks in `generated-blocks/quarantine/`
 * with their lint-failure reasons and per-block Delete / Retry actions.
 *
 * The panel renders as a collapsible banner above the main library list when
 * any quarantined blocks exist.  Each entry shows:
 *   - the block filename (slug derived from the filename)
 *   - the sender email (parsed from the manifest header, or "unknown sender")
 *   - a summary of the first failure reason
 *   - Delete — removes the .tsx file and its .violations.json sidecar
 *   - Retry — re-runs the receive pipeline (useful if lint rules were updated)
 */

import { useCallback, useEffect, useState, type CSSProperties, type FC } from "react";
import type { AuthoredReceiveResult } from "../../ipc/authored-block";
import type { LintViolation } from "../../ipc/authored-block";
import { parseManifestHeader } from "../../blocks/authored/manifest-header";

// ─── Deps interface ───────────────────────────────────────────────────────────

export interface QuarantinePanelDeps {
  /** List files in `quarantineDir`. */
  listDirectory: (path: string) => Promise<{ name: string; path: string; is_dir: boolean }[]>;
  /** Read a file as text (used to read the .tsx source and .violations.json). */
  readFile: (path: string) => Promise<string>;
  /** Delete a single file. */
  deleteFile: (path: string) => Promise<void>;
  /**
   * Re-run the receive pipeline on a quarantined source.
   * Called with the absolute path of the .tsx file.
   */
  importAuthoredBlock: (path: string) => Promise<AuthoredReceiveResult>;
  /**
   * Regenerate a scaffold-mismatched block against the current scaffold.
   * Called for entries quarantined with the `scaffold-version-mismatch` rule
   * (T-166). The dep reads the original prompt from the manifest header, calls
   * the LLM with the current scaffold context, re-runs the receive pipeline,
   * and returns the result.
   *
   * Optional — if not provided, scaffold-mismatch entries show a disabled
   * Regenerate button (useful when no LLM client is configured).
   */
  regenerateBlock?: (sourcePath: string) => Promise<AuthoredReceiveResult>;
}

export interface QuarantinePanelProps {
  /** Absolute path to `generated-blocks/quarantine/`. */
  quarantineDir: string;
  deps: QuarantinePanelDeps;
  /** Called after a successful retry so the palette can refresh. */
  onRetrySuccess?: () => void;
}

// ─── Internal constants ───────────────────────────────────────────────────────

const SCAFFOLD_MISMATCH_RULE = "scaffold-version-mismatch";

// ─── Internal types ───────────────────────────────────────────────────────────

interface QuarantineEntry {
  /** Absolute path to the .tsx file. */
  sourcePath: string;
  /** Leaf filename, e.g. "bad-block.tsx". */
  filename: string;
  /** Slug derived from filename. */
  slug: string;
  /** Sender from the manifest header, or "unknown sender". */
  sender: string;
  /** Violation list from the sidecar JSON. Empty when sidecar is missing. */
  violations: LintViolation[];
  /** True when the sole reason for quarantine is a scaffold-version mismatch. */
  isScaffoldMismatch: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const QuarantinePanel: FC<QuarantinePanelProps> = ({
  quarantineDir,
  deps,
  onRetrySuccess,
}) => {
  const [entries, setEntries] = useState<QuarantineEntry[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const loadEntries = useCallback(async (): Promise<void> => {
    let dirEntries: { name: string; path: string; is_dir: boolean }[];
    try {
      dirEntries = await deps.listDirectory(quarantineDir);
    } catch {
      // Quarantine dir does not exist yet — treat as empty.
      setEntries([]);
      return;
    }

    const tsxFiles = dirEntries.filter(
      (e) => !e.is_dir && e.name.endsWith(".tsx") && !e.name.startsWith("."),
    );

    const loaded: QuarantineEntry[] = [];
    for (const file of tsxFiles) {
      const slug = file.name.slice(0, -4); // strip .tsx

      // Parse the manifest header for the sender field.
      let sender = "unknown sender";
      try {
        const source = await deps.readFile(file.path);
        const parsed = parseManifestHeader(source);
        if (parsed.ok) sender = parsed.header.sender;
      } catch {
        // Unreadable — keep "unknown sender"
      }

      // Load violations from the sidecar JSON.
      let violations: LintViolation[] = [];
      const sidecarPath = `${file.path}.violations.json`;
      try {
        const raw = await deps.readFile(sidecarPath);
        violations = JSON.parse(raw) as LintViolation[];
      } catch {
        // Missing or malformed sidecar — show empty violations.
      }

      const isScaffoldMismatch =
        violations.length === 1 && violations[0]?.rule === SCAFFOLD_MISMATCH_RULE;
      loaded.push({ sourcePath: file.path, filename: file.name, slug, sender, violations, isScaffoldMismatch });
    }
    setEntries(loaded);
  }, [quarantineDir, deps]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  /** Remove a single entry from local state without re-fetching from disk. */
  const removeEntry = useCallback((sourcePath: string): void => {
    setEntries((prev) => prev.filter((e) => e.sourcePath !== sourcePath));
  }, []);

  const handleDelete = useCallback(
    async (entry: QuarantineEntry): Promise<void> => {
      try {
        await deps.deleteFile(entry.sourcePath);
        // Best-effort sidecar removal — ignore if sidecar is missing.
        try {
          await deps.deleteFile(`${entry.sourcePath}.violations.json`);
        } catch {
          /* sidecar may not exist */
        }
        // Remove from local state; no re-fetch needed.
        removeEntry(entry.sourcePath);
      } catch (err: unknown) {
        setActionErrors((prev) => ({
          ...prev,
          [entry.sourcePath]: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [deps, removeEntry],
  );

  const handleRetry = useCallback(
    async (entry: QuarantineEntry): Promise<void> => {
      try {
        const result = await deps.importAuthoredBlock(entry.sourcePath);
        if (result.ok) {
          // Lint passed — delete both quarantine files and notify parent.
          await deps.deleteFile(entry.sourcePath);
          try {
            await deps.deleteFile(`${entry.sourcePath}.violations.json`);
          } catch {
            /* sidecar may not exist */
          }
          removeEntry(entry.sourcePath);
          onRetrySuccess?.();
        } else {
          // Still failing — update violations in state without re-fetching.
          setEntries((prev) =>
            prev.map((e) =>
              e.sourcePath === entry.sourcePath
                ? { ...e, violations: result.violations }
                : e,
            ),
          );
          setActionErrors((prev) => ({
            ...prev,
            [entry.sourcePath]: `Retry failed: ${result.violations.length} violation(s) — ${result.violations[0]?.message ?? "unknown"}`,
          }));
        }
      } catch (err: unknown) {
        setActionErrors((prev) => ({
          ...prev,
          [entry.sourcePath]: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [deps, removeEntry, onRetrySuccess],
  );

  const handleRegenerate = useCallback(
    async (entry: QuarantineEntry): Promise<void> => {
      if (deps.regenerateBlock === undefined) return;
      try {
        const result = await deps.regenerateBlock(entry.sourcePath);
        if (result.ok) {
          // Regeneration produced a lint-passing block — delete quarantine files.
          await deps.deleteFile(entry.sourcePath);
          try {
            await deps.deleteFile(`${entry.sourcePath}.violations.json`);
          } catch {
            /* sidecar may not exist */
          }
          removeEntry(entry.sourcePath);
          onRetrySuccess?.();
        } else {
          // Regeneration produced a block that still fails lint — update entry.
          const isScaffoldMismatch =
            result.violations.length === 1 &&
            result.violations[0]?.rule === SCAFFOLD_MISMATCH_RULE;
          setEntries((prev) =>
            prev.map((e) =>
              e.sourcePath === entry.sourcePath
                ? { ...e, violations: result.violations, isScaffoldMismatch }
                : e,
            ),
          );
          setActionErrors((prev) => ({
            ...prev,
            [entry.sourcePath]: `Regeneration failed: ${result.violations.length} violation(s) — ${result.violations[0]?.message ?? "unknown"}`,
          }));
        }
      } catch (err: unknown) {
        setActionErrors((prev) => ({
          ...prev,
          [entry.sourcePath]: `Regeneration error: ${err instanceof Error ? err.message : String(err)}`,
        }));
      }
    },
    [deps, removeEntry, onRetrySuccess],
  );

  if (entries.length === 0) return null;

  return (
    <section aria-label="Quarantined blocks" style={styles.panel}>
      <header style={styles.panelHeader}>
        <span style={styles.panelTitle}>
          ⚠ {entries.length} quarantined block{entries.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((c) => !c)}
          style={styles.collapseButton}
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </header>
      {!collapsed && (
        <ul style={styles.list}>
          {entries.map((entry) => {
            const firstViolation = entry.violations[0];
            const actionError = actionErrors[entry.sourcePath];
            return (
              <li key={entry.sourcePath} style={styles.item}>
                <div style={styles.itemHeader}>
                  <strong>{entry.slug}</strong>
                  <span style={styles.sender}>{entry.sender}</span>
                </div>
                <p style={styles.reason}>
                  {firstViolation !== undefined
                    ? `${firstViolation.rule}: ${firstViolation.message}${
                        entry.violations.length > 1
                          ? ` (+${entry.violations.length - 1} more)`
                          : ""
                      }`
                    : "No violation details available."}
                </p>
                {actionError !== undefined && (
                  <p role="alert" style={styles.actionError}>{actionError}</p>
                )}
                <div style={styles.actions}>
                  {entry.isScaffoldMismatch ? (
                    <button
                      type="button"
                      aria-label={`Regenerate ${entry.slug} against current scaffold`}
                      disabled={deps.regenerateBlock === undefined}
                      onClick={() => { void handleRegenerate(entry); }}
                      style={styles.regenerateButton}
                    >
                      Regenerate against current scaffold
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Retry import for ${entry.slug}`}
                      onClick={() => { void handleRetry(entry); }}
                      style={styles.retryButton}
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Delete quarantined block ${entry.slug}`}
                    onClick={() => { void handleDelete(entry); }}
                    style={styles.deleteButton}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  panel: {
    background: "Canvas",
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    overflow: "hidden",
  },
  panelHeader: {
    alignItems: "center",
    background: "#fff3cd",
    display: "flex",
    gap: "0.75rem",
    justifyContent: "space-between",
    padding: "0.5rem 0.75rem",
  },
  panelTitle: {
    fontWeight: 600,
  } as CSSProperties,
  collapseButton: {
    cursor: "pointer",
    padding: "0.125rem 0.5rem",
  } as CSSProperties,
  list: {
    listStyle: "none",
    margin: 0,
    padding: "0.5rem",
    display: "grid",
    gap: "0.5rem",
  } as CSSProperties,
  item: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.375rem",
    padding: "0.5rem 0.75rem",
  } as CSSProperties,
  itemHeader: {
    alignItems: "baseline",
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.25rem",
  } as CSSProperties,
  sender: {
    color: "GrayText",
    fontSize: "0.875em",
  } as CSSProperties,
  reason: {
    color: "CanvasText",
    fontSize: "0.875em",
    margin: "0 0 0.5rem",
  } as CSSProperties,
  actionError: {
    color: "red",
    fontSize: "0.875em",
    margin: "0 0 0.5rem",
  } as CSSProperties,
  actions: {
    display: "flex",
    gap: "0.5rem",
  } as CSSProperties,
  retryButton: {
    cursor: "pointer",
    padding: "0.25rem 0.75rem",
  } as CSSProperties,
  regenerateButton: {
    cursor: "pointer",
    fontWeight: 600,
    padding: "0.25rem 0.75rem",
  } as CSSProperties,
  deleteButton: {
    cursor: "pointer",
    padding: "0.25rem 0.75rem",
  } as CSSProperties,
} satisfies Record<string, CSSProperties>;

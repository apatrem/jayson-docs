/**
 * AuthoredBlockManager (T-169, ADR-0010) — collapsible panel listing all
 * Authored blocks (active + archived) with per-block lifecycle actions:
 *
 *   Active block:   Archive   (moves to archived/ → hidden from palette)
 *   Archived block: Restore   (moves back to active/ → re-appears in palette)
 *                   Delete ⚠  (permanently removes; docs render placeholder)
 *
 * Permanent-delete shows a confirmation prompt that counts how many currently-
 * open documents reference the block (in-memory scan; library-wide scan is
 * deferred per ADR-0010).  If the caller provides `openDocBlockTypes`, the
 * count is non-zero; otherwise it defaults to zero.
 *
 * The panel renders `null` when no Authored blocks exist.
 */

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type FC,
} from "react";
import type { BlockPaletteItem } from "../../editor/BlockPalette";

// ─── Deps interface ───────────────────────────────────────────────────────────

export interface AuthoredBlockManagerDeps {
  /** Load all Authored blocks (active + archived) tagged with folder origin. */
  loadEntries: (cloudSyncRoot: string) => Promise<BlockPaletteItem[]>;
  /** Move `srcPath` to `dstDir`. Returns the new absolute path. */
  archiveBlock: (srcPath: string, dstDir: string) => Promise<string>;
  /** Move `srcPath` back to `dstDir`. Returns the new absolute path. */
  restoreBlock: (srcPath: string, dstDir: string) => Promise<string>;
  /** Permanently delete `path` and its sidecar. */
  permanentlyDeleteBlock: (path: string) => Promise<void>;
}

export interface AuthoredBlockManagerProps {
  /** Absolute path to the cloud-sync root (e.g. ~/Dropbox). */
  cloudSyncRoot: string;
  deps: AuthoredBlockManagerDeps;
  /**
   * Block types referenced by any currently-open document.
   * Used to warn the user before a permanent delete.
   * Defaults to an empty set (library context = no open docs).
   */
  openDocBlockTypes?: ReadonlySet<string>;
  /** Called after archive/restore/delete so the palette can refresh. */
  onBlocksChanged?: () => void;
}

// ─── Derived path helpers ─────────────────────────────────────────────────────

function activeDir(cloudSyncRoot: string): string {
  return cloudSyncRoot.endsWith("/")
    ? `${cloudSyncRoot}generated-blocks/active`
    : `${cloudSyncRoot}/generated-blocks/active`;
}

function archivedDir(cloudSyncRoot: string): string {
  return cloudSyncRoot.endsWith("/")
    ? `${cloudSyncRoot}generated-blocks/archived`
    : `${cloudSyncRoot}/generated-blocks/archived`;
}

function blockFilePath(folderDir: string, id: string): string {
  // id is "authored:slug" — extract the slug part.
  const slug = id.startsWith("authored:") ? id.slice("authored:".length) : id;
  return `${folderDir}/${slug}.tsx`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AuthoredBlockManager: FC<AuthoredBlockManagerProps> = ({
  cloudSyncRoot,
  deps,
  openDocBlockTypes = new Set(),
  onBlocksChanged,
}) => {
  const [entries, setEntries] = useState<BlockPaletteItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const loadEntries = useCallback(async (): Promise<void> => {
    try {
      const all = await deps.loadEntries(cloudSyncRoot);
      setEntries(all);
    } catch {
      setEntries([]);
    }
  }, [cloudSyncRoot, deps]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const clearError = useCallback((id: string): void => {
    setActionErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleArchive = useCallback(
    async (entry: BlockPaletteItem): Promise<void> => {
      clearError(entry.id);
      const srcDir = activeDir(cloudSyncRoot);
      const dstDir = archivedDir(cloudSyncRoot);
      const srcPath = blockFilePath(srcDir, entry.id);
      try {
        await deps.archiveBlock(srcPath, dstDir);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, folder: "archived" as const } : e,
          ),
        );
        onBlocksChanged?.();
      } catch (err: unknown) {
        setActionErrors((prev) => ({
          ...prev,
          [entry.id]: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [cloudSyncRoot, deps, onBlocksChanged, clearError],
  );

  const handleRestore = useCallback(
    async (entry: BlockPaletteItem): Promise<void> => {
      clearError(entry.id);
      const srcDir = archivedDir(cloudSyncRoot);
      const dstDir = activeDir(cloudSyncRoot);
      const srcPath = blockFilePath(srcDir, entry.id);
      try {
        await deps.restoreBlock(srcPath, dstDir);
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id ? { ...e, folder: "active" as const } : e,
          ),
        );
        onBlocksChanged?.();
      } catch (err: unknown) {
        setActionErrors((prev) => ({
          ...prev,
          [entry.id]: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [cloudSyncRoot, deps, onBlocksChanged, clearError],
  );

  const handlePermanentDelete = useCallback(
    async (entry: BlockPaletteItem): Promise<void> => {
      clearError(entry.id);

      // Derive the Authored block type string for the open-doc scan.
      // entry.id is "authored:slug"; the type string is "{sender}:{slug}".
      // In the library context there are no open docs, so openDocBlockTypes
      // is empty — but the dep is injectable for tests.
      const openCount = [...openDocBlockTypes].filter((t) =>
        t.endsWith(`:${entry.id.replace(/^authored:/, "")}`),
      ).length;

      const confirmMessage =
        openCount > 0
          ? `Permanently delete "${entry.name}"?\n\n` +
            `⚠ ${openCount} open document${openCount === 1 ? "" : "s"} use${openCount === 1 ? "s" : ""} this block. ` +
            `Those documents will show a removed-block placeholder after deletion.\n\nThis cannot be undone.`
          : `Permanently delete "${entry.name}"?\n\nThis cannot be undone.`;

      // eslint-disable-next-line no-alert
      if (!window.confirm(confirmMessage)) return;

      const srcDir = archivedDir(cloudSyncRoot);
      const srcPath = blockFilePath(srcDir, entry.id);
      try {
        await deps.permanentlyDeleteBlock(srcPath);
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        onBlocksChanged?.();
      } catch (err: unknown) {
        setActionErrors((prev) => ({
          ...prev,
          [entry.id]: err instanceof Error ? err.message : String(err),
        }));
      }
    },
    [cloudSyncRoot, deps, onBlocksChanged, openDocBlockTypes, clearError],
  );

  if (entries.length === 0) return null;

  const activeEntries = entries.filter((e) => e.folder === "active");
  const archivedEntries = entries.filter((e) => e.folder === "archived");

  return (
    <section aria-label="Manage Authored blocks" style={styles.panel}>
      <header style={styles.panelHeader}>
        <span style={styles.panelTitle}>
          Authored blocks ({activeEntries.length} active
          {archivedEntries.length > 0 ? `, ${archivedEntries.length} archived` : ""})
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
        <div style={styles.body}>
          {activeEntries.length > 0 && (
            <section aria-label="Active blocks">
              <p style={styles.sectionLabel}>Active</p>
              <ul style={styles.list}>
                {activeEntries.map((entry) => (
                  <BlockEntry
                    key={entry.id}
                    entry={entry}
                    actionError={actionErrors[entry.id]}
                    onArchive={() => { void handleArchive(entry); }}
                  />
                ))}
              </ul>
            </section>
          )}

          {archivedEntries.length > 0 && (
            <section aria-label="Archived blocks">
              <p style={styles.sectionLabel}>Archived</p>
              <ul style={styles.list}>
                {archivedEntries.map((entry) => (
                  <BlockEntry
                    key={entry.id}
                    entry={entry}
                    actionError={actionErrors[entry.id]}
                    onRestore={() => { void handleRestore(entry); }}
                    onPermanentDelete={() => { void handlePermanentDelete(entry); }}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </section>
  );
};

// ─── Block entry sub-component ────────────────────────────────────────────────

interface BlockEntryProps {
  entry: BlockPaletteItem;
  actionError: string | undefined;
  onArchive?: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
}

const BlockEntry: FC<BlockEntryProps> = ({
  entry,
  actionError,
  onArchive,
  onRestore,
  onPermanentDelete,
}) => (
  <li style={styles.item}>
    <div style={styles.itemRow}>
      <span style={styles.itemName}>{entry.name}</span>
      <span style={styles.itemId}>{entry.id}</span>
      <div style={styles.actions}>
        {onArchive !== undefined && (
          <button
            type="button"
            aria-label={`Archive ${entry.id}`}
            onClick={onArchive}
            style={styles.actionButton}
          >
            Archive
          </button>
        )}
        {onRestore !== undefined && (
          <button
            type="button"
            aria-label={`Restore ${entry.id}`}
            onClick={onRestore}
            style={styles.actionButton}
          >
            Restore
          </button>
        )}
        {onPermanentDelete !== undefined && (
          <button
            type="button"
            aria-label={`Permanently delete ${entry.id}`}
            onClick={onPermanentDelete}
            style={{ ...styles.actionButton, ...styles.deleteButton }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
    {actionError !== undefined && (
      <p role="alert" style={styles.actionError}>{actionError}</p>
    )}
  </li>
);

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
    background: "ButtonFace",
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
  body: {
    display: "grid",
    gap: "0.75rem",
    padding: "0.75rem",
  } as CSSProperties,
  sectionLabel: {
    color: "GrayText",
    fontSize: "0.75em",
    fontWeight: 600,
    letterSpacing: "0.05em",
    margin: "0 0 0.375rem",
    textTransform: "uppercase" as const,
  } as CSSProperties,
  list: {
    display: "grid",
    gap: "0.375rem",
    listStyle: "none",
    margin: 0,
    padding: 0,
  } as CSSProperties,
  item: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.375rem",
    padding: "0.375rem 0.625rem",
  } as CSSProperties,
  itemRow: {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
  } as CSSProperties,
  itemName: {
    flex: 1,
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  } as CSSProperties,
  itemId: {
    color: "GrayText",
    fontSize: "0.8em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  } as CSSProperties,
  actions: {
    display: "flex",
    flexShrink: 0,
    gap: "0.25rem",
  } as CSSProperties,
  actionButton: {
    cursor: "pointer",
    fontSize: "0.8em",
    padding: "0.125rem 0.5rem",
  } as CSSProperties,
  deleteButton: {
    color: "#c0392b",
  } as CSSProperties,
  actionError: {
    color: "red",
    fontSize: "0.8em",
    margin: "0.25rem 0 0",
  } as CSSProperties,
} satisfies Record<string, CSSProperties>;

import type { CSSProperties, FC } from "react";
import type { LibraryEntry } from "./filter";
import { thumbnailUri } from "./thumbnail";

export interface DocCardProps {
  entry: LibraryEntry;
  onOpen: (entry: LibraryEntry) => void;
  onOpenAsReviewer: (entry: LibraryEntry) => void;
  onDuplicate: (entry: LibraryEntry) => void;
  onArchive: (entry: LibraryEntry) => void;
  onShowInFolder: (entry: LibraryEntry) => void;
  compact?: boolean;
}

export const DocCard: FC<DocCardProps> = ({
  entry,
  onOpen,
  onOpenAsReviewer,
  onDuplicate,
  onArchive,
  onShowInFolder,
  compact = false,
}) => (
  <article style={compact ? styles.rowCard : styles.card}>
    <button type="button" style={styles.mainButton} onClick={() => onOpen(entry)}>
      <Thumbnail entry={entry} compact={compact} />
      <span style={styles.body}>
        <strong>{entry.meta.client}</strong>
        <span>{entry.meta.project}</span>
        <span style={styles.meta}>
          {entry.meta.docKind} · {entry.meta.status} · {relativeDate(entry.meta.updatedAt)}
        </span>
        <span style={styles.badges}>
          {entry.hasUnsavedComments ? <Badge>Comments</Badge> : null}
          {entry.hasAssetIssues ? <Badge>Asset issues</Badge> : null}
          {entry.meta.confidentialityLevel === "high" ? <Badge>High confidence</Badge> : null}
        </span>
      </span>
    </button>
    <div style={styles.actions}>
      <button type="button" onClick={() => onOpenAsReviewer(entry)}>
        Open as reviewer
      </button>
      <button type="button" onClick={() => onDuplicate(entry)}>
        Duplicate
      </button>
      <button type="button" onClick={() => onArchive(entry)}>
        Archive
      </button>
      <button type="button" onClick={() => onShowInFolder(entry)}>
        Show in folder
      </button>
    </div>
  </article>
);

const Thumbnail: FC<{ entry: LibraryEntry; compact: boolean }> = ({ entry, compact }) => (
  <span style={compact ? styles.thumbSmall : styles.thumb}>
    {entry.thumbnailUri === null ? "Preview" : <img src={thumbnailUri(entry) ?? ""} alt="" />}
  </span>
);

const Badge: FC<{ children: string }> = ({ children }) => (
  <span style={styles.badge}>{children}</span>
);

function relativeDate(value: string): string {
  const days = Math.round((Date.now() - Date.parse(value)) / 86_400_000);
  if (days <= 0) {
    return "today";
  }
  if (days === 1) {
    return "yesterday";
  }
  return `${days} days ago`;
}

const styles: Record<string, CSSProperties> = {
  card: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    display: "grid",
    gap: "0.5rem",
    padding: "0.75rem",
  },
  rowCard: {
    alignItems: "center",
    borderBottom: "1px solid ButtonBorder",
    display: "grid",
    gap: "0.5rem",
    gridTemplateColumns: "1fr auto",
    padding: "0.75rem 0",
  },
  mainButton: {
    background: "transparent",
    border: 0,
    color: "inherit",
    cursor: "pointer",
    display: "grid",
    gap: "0.5rem",
    padding: 0,
    textAlign: "left",
  },
  thumb: {
    alignItems: "center",
    aspectRatio: "4 / 3",
    border: "1px solid ButtonBorder",
    borderRadius: "0.375rem",
    color: "GrayText",
    display: "flex",
    justifyContent: "center",
  },
  thumbSmall: {
    color: "GrayText",
  },
  body: {
    display: "grid",
    gap: "0.25rem",
  },
  meta: {
    color: "GrayText",
  },
  badges: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.25rem",
  },
  badge: {
    border: "1px solid ButtonBorder",
    borderRadius: "999px",
    fontSize: "0.75rem",
    padding: "0.125rem 0.375rem",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.375rem",
  },
};

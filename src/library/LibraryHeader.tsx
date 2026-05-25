import type { CSSProperties, FC } from "react";

export interface LibraryHeaderProps {
  onNewFromTemplate?: () => void;
  onOpenFromDisk: () => void;
  onRefresh: () => void;
  onSettings: () => void;
}

export const LibraryHeader: FC<LibraryHeaderProps> = ({
  onNewFromTemplate,
  onOpenFromDisk,
  onRefresh,
  onSettings,
}) => (
  <header style={styles.header}>
    <div>
      <h1 style={styles.title}>Library</h1>
      <p style={styles.subtitle}>Browse documents in your cloud-sync folder.</p>
    </div>
    <div style={styles.actions}>
      <button type="button" onClick={onNewFromTemplate}>
        New from template
      </button>
      <button type="button" onClick={onOpenFromDisk}>
        Open from disk
      </button>
      <button type="button" onClick={onRefresh}>
        Refresh
      </button>
      <button type="button" onClick={onSettings}>
        Settings
      </button>
    </div>
  </header>
);

const styles: Record<string, CSSProperties> = {
  header: {
    alignItems: "center",
    borderBottom: "1px solid ButtonBorder",
    display: "flex",
    gap: "1rem",
    justifyContent: "space-between",
    paddingBottom: "1rem",
  },
  title: {
    margin: 0,
  },
  subtitle: {
    color: "GrayText",
    margin: "0.25rem 0 0",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
};

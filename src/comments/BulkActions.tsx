import type { CSSProperties, FC } from "react";

export interface BulkActionsProps {
  pendingCount: number;
  followUpCount: number;
  onAcceptAllVisible?: (() => void) | undefined;
  onRejectAllVisible?: (() => void) | undefined;
  onSendFollowUps?: (() => void) | undefined;
}

export const BulkActions: FC<BulkActionsProps> = ({
  pendingCount,
  followUpCount,
  onAcceptAllVisible,
  onRejectAllVisible,
  onSendFollowUps,
}) => {
  const handleAcceptAll = () => {
    if (pendingCount > 5) {
      const confirmed = window.confirm(
        `Accept ${pendingCount} proposed changes? You can undo individually.`,
      );
      if (!confirmed) {
        return;
      }
    }
    onAcceptAllVisible?.();
  };

  return (
    <div aria-label="Bulk review actions" style={styles.actions}>
      <button
        type="button"
        disabled={pendingCount === 0 || onAcceptAllVisible === undefined}
        onClick={handleAcceptAll}
      >
        Accept all visible
      </button>
      <button
        type="button"
        disabled={pendingCount === 0 || onRejectAllVisible === undefined}
        onClick={onRejectAllVisible}
      >
        Reject all visible
      </button>
      {followUpCount === 0 ? null : (
        <button type="button" onClick={onSendFollowUps}>
          Send {followUpCount} {followUpCount === 1 ? "follow-up" : "follow-ups"}
        </button>
      )}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  actions: {
    borderTop: "1px solid ButtonBorder",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    paddingTop: "0.75rem",
  },
};

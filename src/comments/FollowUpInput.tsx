import type { CSSProperties, FC, FormEvent } from "react";
import { useState } from "react";

export interface FollowUpInputProps {
  commentId: string;
  initialValue?: string | undefined;
  onQueue: (text: string) => void;
  onCancel?: (() => void) | undefined;
}

export const FollowUpInput: FC<FollowUpInputProps> = ({
  commentId,
  initialValue = "",
  onQueue,
  onCancel,
}) => {
  const [text, setText] = useState(initialValue);
  const trimmed = text.trim();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (trimmed.length === 0) {
      return;
    }
    onQueue(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <label style={styles.label}>
        Follow-up for {commentId}
        <textarea
          aria-label={`Follow-up for ${commentId}`}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          rows={3}
          style={styles.textarea}
        />
      </label>
      <div style={styles.actions}>
        {onCancel === undefined ? null : (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={trimmed.length === 0}>
          Queue follow-up
        </button>
      </div>
    </form>
  );
};

const styles: Record<string, CSSProperties> = {
  form: {
    display: "grid",
    gap: "0.5rem",
  },
  label: {
    display: "grid",
    gap: "0.375rem",
  },
  textarea: {
    font: "inherit",
    resize: "vertical",
  },
  actions: {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "flex-end",
  },
};

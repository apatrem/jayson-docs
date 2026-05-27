import type { CSSProperties } from "react";

export interface CreateFromTemplateButtonProps {
  onOpen: () => void;
}

export function CreateFromTemplateButton({ onOpen }: CreateFromTemplateButtonProps) {
  return (
    <button type="button" onClick={onOpen} style={styles.button}>
      + New from template
    </button>
  );
}

const styles = {
  button: {
    cursor: "pointer",
    padding: "0.5rem 0.875rem",
    borderRadius: "0.375rem",
    border: "1px solid ButtonBorder",
  },
} satisfies Record<string, CSSProperties>;

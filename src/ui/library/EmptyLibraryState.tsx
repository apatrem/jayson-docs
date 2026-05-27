import type { CSSProperties } from "react";

export interface EmptyLibraryStateProps {
  onUseSample: () => void;
}

export function EmptyLibraryState({ onUseSample }: EmptyLibraryStateProps) {
  return (
    <section aria-label="Empty library" style={styles.container}>
      <p style={styles.message}>No documents yet.</p>
      <button
        type="button"
        onClick={onUseSample}
        style={styles.button}
      >
        Use Sample Document
      </button>
    </section>
  );
}

const styles = {
  container: {
    alignItems: "center",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
    padding: "2rem",
  },
  message: {
    color: "GrayText",
    margin: 0,
  },
  button: {
    cursor: "pointer",
    padding: "0.5rem 1rem",
  },
} satisfies Record<string, CSSProperties>;

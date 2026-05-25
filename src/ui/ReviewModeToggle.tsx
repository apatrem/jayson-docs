import type { CSSProperties, FC, KeyboardEvent } from "react";
import { useEffect, useState } from "react";

export const REVIEW_MODES = ["panel", "inline", "diff"] as const;
export type ReviewMode = (typeof REVIEW_MODES)[number];

export interface ReviewModeStore {
  getReviewMode: () => Promise<ReviewMode | null> | ReviewMode | null;
  setReviewMode: (mode: ReviewMode) => Promise<void> | void;
}

export interface ReviewModeToggleProps {
  value?: ReviewMode | undefined;
  defaultMode?: ReviewMode | undefined;
  store?: ReviewModeStore | undefined;
  onChange?: ((mode: ReviewMode) => void) | undefined;
}

const STORAGE_KEY = "docsystem.editor.reviewMode";

export const browserReviewModeStore: ReviewModeStore = {
  getReviewMode() {
    if (typeof window === "undefined" || window.localStorage === undefined) {
      return null;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isReviewMode(stored) ? stored : null;
  },
  setReviewMode(mode) {
    if (typeof window !== "undefined" && window.localStorage !== undefined) {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  },
};

export function createMemoryReviewModeStore(
  initialMode: ReviewMode | null = null,
): ReviewModeStore {
  let current = initialMode;
  return {
    getReviewMode: () => current,
    setReviewMode: (mode) => {
      current = mode;
    },
  };
}

export const ReviewModeToggle: FC<ReviewModeToggleProps> = ({
  value,
  defaultMode = "panel",
  store = browserReviewModeStore,
  onChange,
}) => {
  const [internalMode, setInternalMode] = useState<ReviewMode>(value ?? defaultMode);
  const mode = value ?? internalMode;

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(store.getReviewMode()).then((storedMode) => {
      if (!cancelled && value === undefined && storedMode !== null) {
        setInternalMode(storedMode);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [store, value]);

  const setMode = (nextMode: ReviewMode) => {
    if (value === undefined) {
      setInternalMode(nextMode);
    }
    void Promise.resolve(store.setReviewMode(nextMode));
    onChange?.(nextMode);
  };

  const cycle = () => {
    const currentIndex = REVIEW_MODES.indexOf(mode);
    setMode(REVIEW_MODES[(currentIndex + 1) % REVIEW_MODES.length] ?? "panel");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "r") {
      event.preventDefault();
      cycle();
    }
  };

  return (
    <div
      role="group"
      aria-label="Review mode"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={styles.group}
    >
      <ModeButton mode="panel" current={mode} onSelect={setMode} label="Panel review" />
      <ModeButton mode="inline" current={mode} onSelect={setMode} label="Inline review" />
      <ModeButton mode="diff" current={mode} onSelect={setMode} label="Diff review" />
    </div>
  );
};

function isReviewMode(value: unknown): value is ReviewMode {
  return typeof value === "string" && REVIEW_MODES.includes(value as ReviewMode);
}

const ModeButton: FC<{
  mode: ReviewMode;
  current: ReviewMode;
  label: string;
  onSelect: (mode: ReviewMode) => void;
}> = ({ mode, current, label, onSelect }) => (
  <button
    type="button"
    aria-pressed={current === mode}
    onClick={() => onSelect(mode)}
    style={{
      ...styles.button,
      ...(current === mode ? styles.activeButton : {}),
    }}
  >
    {label}
  </button>
);

const styles: Record<string, CSSProperties> = {
  group: {
    display: "inline-flex",
    gap: "0.25rem",
  },
  button: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.375rem",
    padding: "0.375rem 0.625rem",
  },
  activeButton: {
    fontWeight: 700,
    outline: "2px solid Highlight",
  },
};

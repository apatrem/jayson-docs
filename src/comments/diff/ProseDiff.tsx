import type { CSSProperties, FC } from "react";

export interface ProseDiffProps {
  before: string;
  after: string;
}

interface DiffToken {
  value: string;
  status: "same" | "removed" | "added";
}

export const ProseDiff: FC<ProseDiffProps> = ({ before, after }) => {
  const tokens = diffWords(before, after);
  return (
    <p aria-label="Prose diff" style={styles.diff}>
      {tokens.map((token, index) => (
        <span
          key={`${token.status}-${index}-${token.value}`}
          data-diff={token.status}
          style={styleForToken(token.status)}
        >
          {token.value}
          {index === tokens.length - 1 ? "" : " "}
        </span>
      ))}
    </p>
  );
};

export function diffWords(before: string, after: string): DiffToken[] {
  const beforeWords = splitWords(before);
  const afterWords = splitWords(after);
  const matrix = longestCommonSubsequence(beforeWords, afterWords);
  const tokens: DiffToken[] = [];
  let beforeIndex = 0;
  let afterIndex = 0;

  while (beforeIndex < beforeWords.length || afterIndex < afterWords.length) {
    if (beforeWords[beforeIndex] === afterWords[afterIndex]) {
      tokens.push({ value: beforeWords[beforeIndex] ?? "", status: "same" });
      beforeIndex += 1;
      afterIndex += 1;
      continue;
    }

    const removeScore = matrix[beforeIndex + 1]?.[afterIndex] ?? -1;
    const addScore = matrix[beforeIndex]?.[afterIndex + 1] ?? -1;
    if (afterIndex >= afterWords.length || removeScore >= addScore) {
      tokens.push({ value: beforeWords[beforeIndex] ?? "", status: "removed" });
      beforeIndex += 1;
    } else {
      tokens.push({ value: afterWords[afterIndex] ?? "", status: "added" });
      afterIndex += 1;
    }
  }

  return tokens.filter((token) => token.value.length > 0);
}

function splitWords(value: string): string[] {
  return value.trim().length === 0 ? [] : value.trim().split(/\s+/);
}

function longestCommonSubsequence(before: string[], after: string[]): number[][] {
  const matrix = Array.from({ length: before.length + 1 }, () =>
    Array.from({ length: after.length + 1 }, () => 0),
  );

  for (let beforeIndex = before.length - 1; beforeIndex >= 0; beforeIndex -= 1) {
    for (let afterIndex = after.length - 1; afterIndex >= 0; afterIndex -= 1) {
      matrix[beforeIndex]![afterIndex] =
        before[beforeIndex] === after[afterIndex]
          ? (matrix[beforeIndex + 1]?.[afterIndex + 1] ?? 0) + 1
          : Math.max(
              matrix[beforeIndex + 1]?.[afterIndex] ?? 0,
              matrix[beforeIndex]?.[afterIndex + 1] ?? 0,
            );
    }
  }

  return matrix;
}

function styleForToken(status: DiffToken["status"]): CSSProperties {
  switch (status) {
    case "added":
      return styles.added ?? {};
    case "removed":
      return styles.removed ?? {};
    case "same":
      return styles.same ?? {};
  }
}

const styles: Record<string, CSSProperties> = {
  diff: {
    margin: 0,
  },
  same: {},
  added: {
    fontWeight: 700,
    textDecoration: "underline",
  },
  removed: {
    opacity: 0.72,
    textDecoration: "line-through",
  },
};

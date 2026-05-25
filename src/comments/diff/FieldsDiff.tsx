import type { CSSProperties, FC } from "react";

export interface FieldsDiffProps {
  before: unknown;
  after: unknown;
}

interface FieldChange {
  path: string;
  before: string;
  after: string;
}

export const FieldsDiff: FC<FieldsDiffProps> = ({ before, after }) => {
  const changes = diffFields(before, after);

  if (changes.length === 0) {
    return <p style={styles.empty}>No field changes detected.</p>;
  }

  return (
    <dl aria-label="Fields diff" style={styles.list}>
      {changes.map((change) => (
        <div key={change.path} style={styles.item}>
          <dt style={styles.path}>{change.path}</dt>
          <dd style={styles.values}>
            <span data-diff="removed" style={styles.removed}>
              {change.before}
            </span>
            <span aria-hidden="true"> {"->"} </span>
            <span data-diff="added" style={styles.added}>
              {change.after}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
};

export function diffFields(before: unknown, after: unknown): FieldChange[] {
  const beforeFlat = flattenValue(before);
  const afterFlat = flattenValue(after);
  const paths = [...new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)])]
    .filter((path) => beforeFlat[path] !== afterFlat[path])
    .sort();

  return paths.map((path) => ({
    path,
    before: beforeFlat[path] ?? "(missing)",
    after: afterFlat[path] ?? "(missing)",
  }));
}

function flattenValue(value: unknown, prefix = ""): Record<string, string> {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { [prefix || "<root>"]: "[]" };
    }
    return Object.assign(
      {},
      ...value.map((entry, index) =>
        flattenValue(entry, prefix.length === 0 ? `[${index}]` : `${prefix}[${index}]`),
      ),
    ) as Record<string, string>;
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return { [prefix || "<root>"]: "{}" };
    }
    return Object.assign(
      {},
      ...entries.map(([key, entry]) =>
        flattenValue(entry, prefix.length === 0 ? key : `${prefix}.${key}`),
      ),
    ) as Record<string, string>;
  }

  return { [prefix || "<root>"]: stringifyScalar(value) };
}

function stringifyScalar(value: unknown): string {
  return value === undefined ? "(missing)" : JSON.stringify(value);
}

const styles: Record<string, CSSProperties> = {
  list: {
    display: "grid",
    gap: "0.5rem",
    margin: 0,
  },
  item: {
    display: "grid",
    gap: "0.25rem",
  },
  path: {
    fontWeight: 700,
  },
  values: {
    display: "flex",
    gap: "0.25rem",
    margin: 0,
  },
  added: {
    fontWeight: 700,
  },
  removed: {
    opacity: 0.72,
    textDecoration: "line-through",
  },
  empty: {
    margin: 0,
  },
};

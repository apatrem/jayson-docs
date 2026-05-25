import type { CSSProperties, FC } from "react";
import type { BlockPatch } from "../schema/block-patch";
import type { Block } from "../schema/blocks";
import { FieldsDiff } from "./diff/FieldsDiff";
import { ProseDiff } from "./diff/ProseDiff";

export interface DiffPreviewProps {
  patch: BlockPatch | null;
  currentBlock?: Block | undefined;
}

export const DiffPreview: FC<DiffPreviewProps> = ({ patch, currentBlock }) => {
  if (patch === null) {
    return <p style={styles.empty}>No valid AI proposal yet.</p>;
  }

  if (patch.op === "remove") {
    return (
      <section aria-label="Diff preview" style={styles.preview}>
        <p style={styles.label}>Will delete this block.</p>
        <p data-diff="removed" style={styles.removed}>
          {extractPlainText(currentBlock) || patch.blockId}
        </p>
      </section>
    );
  }

  if (patch.op === "insert-after") {
    return (
      <section aria-label="Diff preview" style={styles.preview}>
        <p style={styles.label}>Will add a new block after {patch.afterBlockId}.</p>
        <FieldsDiff before={null} after={patch.block} />
      </section>
    );
  }

  const beforeText = extractPlainText(currentBlock);
  const afterText = extractPlainText(patch.block);
  const showProse = beforeText.length > 0 && afterText.length > 0;

  return (
    <section aria-label="Diff preview" style={styles.preview}>
      {patch.reason === undefined ? null : (
        <p style={styles.reason}>Reason: {patch.reason}</p>
      )}
      {showProse ? (
        <ProseDiff before={beforeText} after={afterText} />
      ) : (
        <FieldsDiff before={currentBlock ?? null} after={patch.block} />
      )}
    </section>
  );
};

export function extractPlainText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(extractPlainText).filter(Boolean).join(" ");
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") {
      return record.text;
    }
    return Object.entries(record)
      .filter(([key]) => !TEXT_METADATA_KEYS.has(key))
      .map(([, entry]) => extractPlainText(entry))
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

const TEXT_METADATA_KEYS = new Set(["id", "type", "align", "note", "variant"]);

const styles: Record<string, CSSProperties> = {
  preview: {
    borderTop: "1px solid ButtonBorder",
    display: "grid",
    gap: "0.5rem",
    paddingTop: "0.75rem",
  },
  label: {
    fontWeight: 700,
    margin: 0,
  },
  reason: {
    margin: 0,
  },
  removed: {
    margin: 0,
    opacity: 0.72,
    textDecoration: "line-through",
  },
  empty: {
    margin: 0,
  },
};

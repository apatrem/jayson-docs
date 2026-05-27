/**
 * RemovedBlockPlaceholder (T-168, ADR-0010)
 *
 * Renders in place of an Authored block whose `.tsx` file has been permanently
 * deleted from disk.  The DocumentRenderer falls back to this component when
 * the block's `{sender}:{slug}` type string is not found in the registry.
 *
 * Shows:
 *   - the missing block's slug (human-readable name derived from the slug part)
 *   - the sender email (from the `{sender}:{slug}` prefix)
 *   - a neutral "removed" label so reviewers know the block is gone
 *
 * Permanently-deleted blocks are distinct from archived blocks — archived
 * blocks still render normally because both `active/` and `archived/` are
 * scanned by the registry loader.
 */

import type { CSSProperties, FC } from "react";
import { parseAuthoredBlockType } from "./authored/identity";

export interface RemovedBlockPlaceholderProps {
  /**
   * The full Authored block type string that was not found in the registry,
   * e.g. `"alice@consulting.example:sector-risk-summary"`.
   */
  blockType: string;
}

export const RemovedBlockPlaceholder: FC<RemovedBlockPlaceholderProps> = ({ blockType }) => {
  const parsed = parseAuthoredBlockType(blockType);
  const slug = parsed !== null ? parsed.slug : blockType;
  const sender = parsed !== null ? parsed.sender : null;

  const displayName = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div
      role="note"
      aria-label={`Removed block: ${blockType}`}
      style={styles.container}
    >
      <span style={styles.icon} aria-hidden="true">⚠</span>
      <div style={styles.body}>
        <p style={styles.title}>{displayName} block removed</p>
        {sender !== null && (
          <p style={styles.sender}>Originally from {sender}</p>
        )}
        <p style={styles.hint}>
          This block was permanently deleted. Re-install it or remove this block
          from the document.
        </p>
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    alignItems: "flex-start",
    background: "#fff8e1",
    border: "1px dashed #f9a825",
    borderRadius: "0.375rem",
    display: "flex",
    gap: "0.75rem",
    margin: "0.5rem 0",
    padding: "0.75rem 1rem",
  } as CSSProperties,
  icon: {
    color: "#f9a825",
    flexShrink: 0,
    fontSize: "1.25rem",
    lineHeight: 1.4,
  } as CSSProperties,
  body: {
    flex: 1,
    minWidth: 0,
  } as CSSProperties,
  title: {
    fontWeight: 600,
    margin: "0 0 0.25rem",
  } as CSSProperties,
  sender: {
    color: "GrayText",
    fontSize: "0.875em",
    margin: "0 0 0.25rem",
  } as CSSProperties,
  hint: {
    color: "GrayText",
    fontSize: "0.875em",
    margin: 0,
  } as CSSProperties,
} satisfies Record<string, CSSProperties>;

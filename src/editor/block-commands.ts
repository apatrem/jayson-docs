import type { EditorState, Transaction } from "@tiptap/pm/state";

/**
 * Build a transaction that sets one attribute on the top-level block whose node
 * starts at `blockStart`, preserving its other attrs. Used by the gutter-handle
 * menu to toggle per-instance layout overrides (ADR-0018): `breakBefore`
 * (item 5) and `spaceBefore` (item 7). Returns null when there's no node there
 * or the value is already set (no-op).
 */
export function setBlockAttr(
  state: EditorState,
  blockStart: number,
  attr: string,
  value: unknown,
): Transaction | null {
  const node = state.doc.nodeAt(blockStart);
  if (node === null) {
    return null;
  }
  if (node.attrs[attr] === value) {
    return null;
  }
  return state.tr.setNodeMarkup(blockStart, undefined, { ...node.attrs, [attr]: value });
}

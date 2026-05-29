/**
 * Central round-trip + naming for the per-instance layout fields on BlockBase
 * (ADR-0018): `breakBefore` and `spaceBefore`. Kept in one place so the 15
 * Standard blocks don't each hand-plumb these like they do `note` — the editor
 * adds them to every block node via a single global-attributes extension
 * (see extensions/BaseBlockAttributes.ts), and the DocModel↔ProseMirror mapping
 * merges them here.
 *
 * Pure module: no @tiptap/* imports. The `ProseMirrorNode` reference is a
 * type-only import (erased at runtime), so there is no runtime cycle with
 * mapping.ts even though mapping.ts imports these helpers.
 *
 * Scope: Standard blocks only. Authored blocks pass their attrs through their
 * own builder and do not yet carry these layout overrides (follow-up).
 */

import type { ProseMirrorNode } from "./mapping";

/** Attr names the editor adds to every Standard block node. Security boundary. */
export const BASE_BLOCK_ATTR_NAMES = ["breakBefore", "spaceBefore"] as const;

/** ProseMirror node-attr defaults — the "no override" state. */
export const BASE_ATTR_DEFAULTS: Readonly<{ breakBefore: boolean; spaceBefore: number | null }> = {
  breakBefore: false,
  spaceBefore: null,
};

/** data-* attribute names used when the nodes render to / parse from HTML. */
export const BREAK_BEFORE_DATA_ATTR = "data-break-before";
export const SPACE_BEFORE_DATA_ATTR = "data-space-before";

interface BaseLayoutFields {
  breakBefore?: boolean;
  spaceBefore?: number;
}

/**
 * Merge a DocModel block's layout overrides into a freshly-built PM node's
 * attrs, normalising to the node defaults (false / null) when unset. Returns a
 * new node object; never mutates the input.
 */
export function withBaseAttrsOnPm(block: unknown, pmNode: ProseMirrorNode): ProseMirrorNode {
  const layout = block as BaseLayoutFields | null;
  const breakBefore = layout?.breakBefore === true;
  const spaceBefore =
    typeof layout?.spaceBefore === "number" && layout.spaceBefore >= 0
      ? layout.spaceBefore
      : null;
  return {
    ...pmNode,
    attrs: { ...(pmNode.attrs ?? {}), breakBefore, spaceBefore },
  };
}

/**
 * Extract the layout overrides from a PM node's attrs, omitting anything at its
 * default so a clean block serializes without `breakBefore`/`spaceBefore` keys.
 */
export function readBaseAttrsFromPm(pmNode: { attrs?: Record<string, unknown> }): BaseLayoutFields {
  const attrs = pmNode.attrs ?? {};
  const out: BaseLayoutFields = {};
  if (attrs.breakBefore === true) {
    out.breakBefore = true;
  }
  const spaceBefore = attrs.spaceBefore;
  if (typeof spaceBefore === "number" && spaceBefore >= 0) {
    out.spaceBefore = spaceBefore;
  }
  return out;
}

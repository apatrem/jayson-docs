import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Editor-only markers for the per-instance layout overrides (ADR-0018). The
 * continuous edit surface has no real pages, so a block with `breakBefore`
 * gets a subtle "page break" rule above it as a node-decoration class. (Node
 * views own their DOM, so the global `data-break-before` attr never reaches
 * their wrapper — a decoration is how we reliably tag them.)
 *
 * Exported helper is unit-tested without a DOM. Spacing-override markers
 * (item 7) can extend this plugin later.
 */

export const BREAK_BEFORE_CLASS = "doc-break-before";

/** Fallback spacing unit if the plugin isn't configured with the brand unit. */
const DEFAULT_SPACING_UNIT = 8;

export interface LayoutMarkersOptions {
  /** Brand spacing unit (px) — spaceBefore is a multiple of this. */
  spacingUnit: number;
}

/**
 * Node decorations for the per-instance layout overrides on each top-level
 * block: a "page break" marker class for `breakBefore`, and a margin-top
 * override for `spaceBefore` (a multiple of the brand spacing unit). Both are
 * combined into one decoration per block. Exported for unit testing.
 */
export function layoutMarkerDecorations(
  doc: PMNode,
  spacingUnit: number = DEFAULT_SPACING_UNIT,
): Decoration[] {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (parent?.type.name === "section") {
      const attrs: { class?: string; style?: string } = {};
      if (node.attrs.breakBefore === true) {
        attrs.class = BREAK_BEFORE_CLASS;
      }
      const spaceBefore: unknown = node.attrs.spaceBefore;
      if (typeof spaceBefore === "number" && spaceBefore >= 0) {
        attrs.style = `margin-top: ${spaceBefore * spacingUnit}px`;
      }
      if (attrs.class !== undefined || attrs.style !== undefined) {
        decorations.push(Decoration.node(pos, pos + node.nodeSize, attrs));
      }
      return false; // top-level blocks only
    }
    return true;
  });
  return decorations;
}

export const LayoutMarkers = Extension.create<LayoutMarkersOptions>({
  name: "layoutMarkers",

  addOptions() {
    return { spacingUnit: DEFAULT_SPACING_UNIT };
  },

  addProseMirrorPlugins() {
    const spacingUnit = this.options.spacingUnit;
    return [
      new Plugin({
        key: new PluginKey("layoutMarkers"),
        props: {
          decorations(state: EditorState) {
            const decorations = layoutMarkerDecorations(state.doc, spacingUnit);
            return decorations.length === 0
              ? DecorationSet.empty
              : DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

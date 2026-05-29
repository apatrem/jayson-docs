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

/** Node decorations tagging each top-level block that starts a new page. */
export function layoutMarkerDecorations(doc: PMNode): Decoration[] {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos, parent) => {
    if (parent?.type.name === "section") {
      if (node.attrs.breakBefore === true) {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, { class: BREAK_BEFORE_CLASS }),
        );
      }
      return false; // top-level blocks only
    }
    return true;
  });
  return decorations;
}

export const LayoutMarkers = Extension.create({
  name: "layoutMarkers",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("layoutMarkers"),
        props: {
          decorations(state: EditorState) {
            const decorations = layoutMarkerDecorations(state.doc);
            return decorations.length === 0
              ? DecorationSet.empty
              : DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

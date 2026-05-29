import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import {
  computeHeadingNumbers,
  type NumberingScheme,
} from "../../blocks/heading/numbering";
import { DEFAULT_LEVEL_FORMATS, DEFAULT_NUMBERING_SEPARATOR } from "../../schema/numbering";

/**
 * Live outline numbering for the editor (ADR-0018, item 4). Recomputes the
 * heading-number projection on every doc change and attaches each heading's
 * number to a node decoration; the heading node view reads it from
 * `decorations` and renders the marker. Because decorations recompute per
 * transaction, inserting/removing a heading correctly renumbers the ones below
 * it live — which a node-view self-scan would miss.
 *
 * The scheme (per-level formats + separator) is resolved once from brand ⊕
 * meta at editor creation and passed in via `configure`.
 */
export interface HeadingNumberOptions {
  scheme: NumberingScheme;
}

/** Decoration spec key carrying the computed number (or "" when unnumbered). */
export interface HeadingNumberSpec {
  headingNumber: string;
}

/**
 * Build one node decoration per heading in `doc`, each carrying its computed
 * number in `spec.headingNumber` (""→ unnumbered). Exported for direct testing
 * without a live editor view.
 */
export function headingNumberDecorations(
  doc: PMNode,
  scheme: NumberingScheme,
): Decoration[] {
  const positions: number[] = [];
  const sizes: number[] = [];
  const headings: { level: number; numbered: boolean }[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      positions.push(pos);
      sizes.push(node.nodeSize);
      headings.push({
        level: Number(node.attrs.level ?? 2),
        numbered: node.attrs.numbered !== false,
      });
      return false; // headings carry only inline text
    }
    return true;
  });
  if (headings.length === 0) {
    return [];
  }
  const numbers = computeHeadingNumbers(headings, scheme);
  return positions.map((pos, index) => {
    const spec: HeadingNumberSpec = { headingNumber: numbers[index] ?? "" };
    return Decoration.node(pos, pos + (sizes[index] ?? 0), {}, spec);
  });
}

export const HeadingNumber = Extension.create<HeadingNumberOptions>({
  name: "headingNumber",

  addOptions() {
    return {
      scheme: {
        levelFormats: DEFAULT_LEVEL_FORMATS,
        separator: DEFAULT_NUMBERING_SEPARATOR,
      },
    };
  },

  addProseMirrorPlugins() {
    const scheme = this.options.scheme;
    return [
      new Plugin({
        key: new PluginKey("headingNumber"),
        props: {
          decorations(state) {
            const decorations = headingNumberDecorations(state.doc, scheme);
            return decorations.length === 0
              ? DecorationSet.empty
              : DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

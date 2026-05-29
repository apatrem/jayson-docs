import { Extension } from "@tiptap/core";
import {
  BREAK_BEFORE_DATA_ATTR,
  SPACE_BEFORE_DATA_ATTR,
  BASE_ATTR_DEFAULTS,
} from "../base-block-attrs";

/**
 * Adds the per-instance layout attrs (`breakBefore`, `spaceBefore` — ADR-0018)
 * to every Standard block node in ONE place, via TipTap global attributes,
 * instead of editing all 15 block node definitions. The node names to target
 * are passed in `types` at registration (see createEditorExtensions); they must
 * be unioned into the closed-schema attr allow-list (`allowedAttrsForNode`),
 * since global attributes are invisible to per-node addAttributes introspection.
 *
 * Authored nodes are intentionally NOT targeted (their attr set is manifest-
 * derived); layout overrides on authored blocks are a follow-up.
 */
export interface BaseBlockAttributesOptions {
  /** Node names that should carry breakBefore/spaceBefore (Standard blocks). */
  types: string[];
}

export const BaseBlockAttributes = Extension.create<BaseBlockAttributesOptions>({
  name: "baseBlockAttributes",

  addOptions() {
    return { types: [] };
  },

  addGlobalAttributes() {
    if (this.options.types.length === 0) {
      return [];
    }
    return [
      {
        types: this.options.types,
        attributes: {
          breakBefore: {
            default: BASE_ATTR_DEFAULTS.breakBefore,
            parseHTML: (el) => el.getAttribute(BREAK_BEFORE_DATA_ATTR) === "true",
            renderHTML: (attrs: { breakBefore?: boolean }) =>
              attrs.breakBefore ? { [BREAK_BEFORE_DATA_ATTR]: "true" } : {},
          },
          spaceBefore: {
            default: BASE_ATTR_DEFAULTS.spaceBefore,
            parseHTML: (el) => {
              const raw = el.getAttribute(SPACE_BEFORE_DATA_ATTR);
              if (raw === null) {
                return null;
              }
              const n = Number(raw);
              return Number.isFinite(n) && n >= 0 ? n : null;
            },
            renderHTML: (attrs: { spaceBefore?: number | null }) =>
              attrs.spaceBefore == null
                ? {}
                : { [SPACE_BEFORE_DATA_ATTR]: String(attrs.spaceBefore) },
          },
        },
      },
    ];
  },
});

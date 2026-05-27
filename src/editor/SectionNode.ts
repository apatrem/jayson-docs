import { Node, mergeAttributes } from "@tiptap/core";

/**
 * DocModel section container — preserves section boundaries in the TipTap
 * document so multi-section YAML round-trips without positional corruption.
 */
export const SectionNode = Node.create({
  name: "section",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      sectionId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-section-id"),
        renderHTML: (attrs: { sectionId: string | null }) => ({
          "data-section-id": attrs.sectionId,
        }),
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title") ?? "",
        renderHTML: (attrs: { title: string }) => ({
          "data-title": attrs.title,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "section[data-section-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["section", mergeAttributes(HTMLAttributes), 0];
  },
});

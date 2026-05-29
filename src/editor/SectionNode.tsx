import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import { useBrandTokens } from "../brand-tokens/useBrandTokens";

/**
 * DocModel section container — preserves section boundaries in the TipTap
 * document so multi-section YAML round-trips without positional corruption.
 *
 * The section title lives in the `title` attr (round-trips to `section.title`)
 * but is NOT rendered in the document or editable here: it is a nav-only label
 * (ADR-0018, item 2), edited in the section sidebar. Visible on-page headers
 * come from heading blocks. The node view just renders the section's blocks.
 */
export const SectionNode = Node.create({
  name: "section",
  content: "block+",
  defining: true,
  isolating: true,
  // Sections are structural containers, not selectable units. Making them
  // non-selectable prevents a click near the section chrome from node-selecting
  // the whole section (which highlighted the entire section); selection lands
  // on the block instead.
  selectable: false,

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

  addNodeView() {
    return ReactNodeViewRenderer(SectionNodeView);
  },
});

// The title is a nav-only attr (edited in the sidebar), so the node view simply
// renders the section's blocks. NodeViewContent holds the section's content.
const SectionNodeView: FC<NodeViewProps> = ({ node }) => {
  const brand = useBrandTokens();
  return (
    <NodeViewWrapper
      as="section"
      data-section-id={String(node.attrs.sectionId ?? "")}
      style={{ marginBottom: brand.spacing.unit * 4 }}
    >
      <NodeViewContent className="doc-section-content" />
    </NodeViewWrapper>
  );
};

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../brand-tokens/resolve";

/**
 * DocModel section container — preserves section boundaries in the TipTap
 * document so multi-section YAML round-trips without positional corruption.
 *
 * The section title lives in the `title` attr (round-trips to `section.title`)
 * and is edited inline through the node view's header field, so the title
 * behaves like a header while the section container stays intact.
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

  addNodeView() {
    return ReactNodeViewRenderer(SectionNodeView);
  },
});

// The title is a plain-string attr, so it's edited via a controlled input
// rather than ProseMirror content. The input sits in a contentEditable=false
// wrapper and stops key/mouse propagation so the editor doesn't hijack the
// caret or keystrokes; NodeViewContent renders the section's blocks below it.
const SectionNodeView: FC<NodeViewProps> = ({ node, updateAttributes }) => {
  const brand = useBrandTokens();
  const title = String(node.attrs.title ?? "");

  const titleStyle: CSSProperties = {
    width: "100%",
    border: "none",
    background: "transparent",
    padding: 0,
    margin: 0,
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.h2,
    lineHeight: brand.typography.lineHeight.tight,
    color: resolveBrandToken(brand, "colors.semantic.headingPrimary"),
    fontWeight: 600,
  };

  return (
    <NodeViewWrapper
      as="section"
      data-section-id={String(node.attrs.sectionId ?? "")}
      style={{ marginBottom: brand.spacing.unit * 4 }}
    >
      <div contentEditable={false} style={{ marginBottom: brand.spacing.unit * 2 }}>
        <input
          type="text"
          aria-label="Section title"
          value={title}
          placeholder="Section title"
          onChange={(event) => updateAttributes({ title: event.target.value })}
          onKeyDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          style={titleStyle}
        />
      </div>
      <NodeViewContent />
    </NodeViewWrapper>
  );
};

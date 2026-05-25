import { Mark, mergeAttributes } from "@tiptap/core";
import { StableIdSchema } from "../schema/stable-id";

export const COMMENT_MARK_NAME = "commentMark";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    commentMark: {
      applyCommentMark: (commentId: string) => ReturnType;
      removeCommentMark: () => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: COMMENT_MARK_NAME,
  inclusive: true,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attrs: { commentId: string | null }) =>
          attrs.commentId === null ? {} : { "data-comment-id": attrs.commentId },
      },
    };
  },

  parseHTML() {
    return [
      { tag: "mark[data-comment-id]" },
      { tag: "span[data-comment-id]" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "mark",
      mergeAttributes(HTMLAttributes, { class: "doc-comment-highlight" }),
      0,
    ];
  },

  addCommands() {
    return {
      applyCommentMark:
        (commentId: string) =>
        ({ commands }) => {
          if (!StableIdSchema.safeParse(commentId).success) {
            return false;
          }
          return commands.setMark(this.name, { commentId });
        },
      removeCommentMark:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

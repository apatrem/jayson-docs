import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { describe, expect, it } from "vitest";
import { CommentMark } from "../../src/comments/CommentMark";
import { createEditorExtensions } from "../../src/editor/Editor";

function createCommentEditor(content = "<p>Hello world</p>"): Editor {
  return new Editor({
    extensions: [Document, Paragraph, Text, CommentMark],
    content,
  });
}

describe("CommentMark", () => {
  it("is registered with the main editor extension set", () => {
    const editor = new Editor({
      extensions: createEditorExtensions(),
      content: "<p>Hello world</p>",
    });

    try {
      expect(editor.schema.marks.commentMark).toBeDefined();
    } finally {
      editor.destroy();
    }
  });

  it("applies a stable comment id to the highlighted range", () => {
    const editor = createCommentEditor();

    try {
      editor.commands.setTextSelection({ from: 1, to: 6 });
      expect(editor.commands.applyCommentMark("comment-1")).toBe(true);

      expect(editor.getJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [
                  {
                    type: "commentMark",
                    attrs: { commentId: "comment-1" },
                  },
                ],
                text: "Hello",
              },
              { type: "text", text: " world" },
            ],
          },
        ],
      });
      expect(editor.getHTML()).toContain(
        '<mark data-comment-id="comment-1" class="doc-comment-highlight">Hello</mark>',
      );
    } finally {
      editor.destroy();
    }
  });

  it("keeps the comment mark anchored when text inside the range changes", () => {
    const editor = createCommentEditor();

    try {
      editor.commands.setTextSelection({ from: 1, to: 6 });
      editor.commands.applyCommentMark("comment-1");
      editor.commands.insertContent("Hi");

      expect(editor.getJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                marks: [
                  {
                    type: "commentMark",
                    attrs: { commentId: "comment-1" },
                  },
                ],
                text: "Hi",
              },
              { type: "text", text: " world" },
            ],
          },
        ],
      });
    } finally {
      editor.destroy();
    }
  });
});

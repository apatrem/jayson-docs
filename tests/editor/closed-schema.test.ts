import { Editor as CoreEditor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_EDITOR_MARK_NAMES,
  ALLOWED_EDITOR_NODE_NAMES,
  assertClosedEditorContent,
  createEditorExtensions,
  sanitizePastedHtml,
} from "../../src/editor/Editor";

describe("closed editor schema (T-78)", () => {
  it("registers only the closed set of editor node names", () => {
    const editor = new CoreEditor({
      extensions: createEditorExtensions(),
      content: {
        type: "doc",
        content: [
          {
            type: "section",
            attrs: { sectionId: "section-1", title: "Section" },
            content: [{ type: "paragraph" }],
          },
        ],
      },
    });

    try {
      expect(Object.keys(editor.schema.nodes).sort()).toEqual(
        [...ALLOWED_EDITOR_NODE_NAMES].sort(),
      );
    } finally {
      editor.destroy();
    }
  });

  it("registers only the closed set of editor mark names", () => {
    const editor = new CoreEditor({
      extensions: createEditorExtensions(),
      content: {
        type: "doc",
        content: [
          {
            type: "section",
            attrs: { sectionId: "section-1", title: "Section" },
            content: [{ type: "paragraph" }],
          },
        ],
      },
    });

    try {
      expect(Object.keys(editor.schema.marks).sort()).toEqual(
        [...ALLOWED_EDITOR_MARK_NAMES].sort(),
      );
    } finally {
      editor.destroy();
    }
  });

  it("rejects unknown editor node types", () => {
    expect(() =>
      assertClosedEditorContent({
        type: "doc",
        content: [{ type: "unknownBlock" }],
      }),
    ).toThrow('Unknown editor node type: unknownBlock');
  });

  it("rejects off-schema attrs on known nodes", () => {
    expect(() =>
      assertClosedEditorContent({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: {
              blockId: "heading-1",
              level: 2,
              text: "Allowed heading",
              numbered: true,
              note: "",
              unexpected: "not allowed",
            },
          },
        ],
      }),
    ).toThrow('Unknown attr "unexpected" on editor node type "heading"');
  });

  it("rejects unknown editor marks", () => {
    expect(() =>
      assertClosedEditorContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Commented",
                marks: [{ type: "unknownMark" }],
              },
            ],
          },
        ],
      }),
    ).toThrow("Unknown editor mark type: unknownMark");
  });

  it("rejects off-schema attrs on known marks", () => {
    expect(() =>
      assertClosedEditorContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Commented",
                marks: [
                  {
                    type: "commentMark",
                    attrs: {
                      commentId: "comment-1",
                      unexpected: "not allowed",
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow('Unknown attr "unexpected" on editor mark type "commentMark"');
  });

  it("accepts a valid commentMark with only the commentId attr (happy path)", () => {
    expect(() =>
      assertClosedEditorContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Commented",
                marks: [
                  {
                    type: "commentMark",
                    attrs: { commentId: "comment-1" },
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).not.toThrow();
  });

  it("drops disallowed pasted HTML elements", () => {
    expect(
      sanitizePastedHtml("<p>Keep</p><script>alert(1)</script><custom>Drop</custom>"),
    ).toBe("<p>Keep</p>");
  });
});

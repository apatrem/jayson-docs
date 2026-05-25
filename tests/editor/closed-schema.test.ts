import { Editor as CoreEditor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_EDITOR_NODE_NAMES,
  assertClosedEditorContent,
  createEditorExtensions,
  sanitizePastedHtml,
} from "../../src/editor/Editor";

describe("closed editor schema (T-78)", () => {
  it("registers only the closed set of editor node names", () => {
    const editor = new CoreEditor({
      extensions: createEditorExtensions(),
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });

    try {
      expect(Object.keys(editor.schema.nodes).sort()).toEqual(
        [...ALLOWED_EDITOR_NODE_NAMES].sort(),
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

  it("drops disallowed pasted HTML elements", () => {
    expect(
      sanitizePastedHtml("<p>Keep</p><script>alert(1)</script><custom>Drop</custom>"),
    ).toBe("<p>Keep</p>");
  });
});

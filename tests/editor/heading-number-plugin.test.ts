import { Editor as CoreEditor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "../../src/editor/Editor";
import { headingNumberDecorations } from "../../src/editor/extensions/HeadingNumber";
import type { NumberingScheme } from "../../src/blocks/heading/numbering";

const DECIMAL: NumberingScheme = {
  levelFormats: ["decimal", "decimal", "decimal", "decimal"],
  separator: ".",
};

function heading(level: number, text: string, numbered = true) {
  return {
    type: "heading",
    attrs: { blockId: `h-${text}`, level, numbered, note: "" },
    content: [{ type: "text", text }],
  };
}

function editorWithHeadings(headings: object[]): CoreEditor {
  return new CoreEditor({
    extensions: createEditorExtensions(),
    content: {
      type: "doc",
      content: [
        {
          type: "section",
          attrs: { sectionId: "section-1", title: "Section" },
          content: headings,
        },
      ],
    },
  });
}

function numbers(editor: CoreEditor): string[] {
  return headingNumberDecorations(editor.state.doc, DECIMAL).map(
    (d) => (d.spec as { headingNumber: string }).headingNumber,
  );
}

describe("HeadingNumber decoration plugin (ADR-0018, item 4)", () => {
  it("assigns outline numbers to heading nodes in document order", () => {
    const editor = editorWithHeadings([
      heading(1, "A"),
      heading(2, "B"),
      heading(2, "C"),
      heading(1, "D"),
    ]);
    try {
      expect(numbers(editor)).toEqual(["1", "1.1", "1.2", "2"]);
    } finally {
      editor.destroy();
    }
  });

  it("marks unnumbered headings with an empty string and does not count them", () => {
    const editor = editorWithHeadings([
      heading(1, "A"),
      heading(2, "B", false),
      heading(2, "C"),
    ]);
    try {
      expect(numbers(editor)).toEqual(["1", "", "1.1"]);
    } finally {
      editor.destroy();
    }
  });

  it("returns no decorations for a document with no headings", () => {
    const editor = new CoreEditor({
      extensions: createEditorExtensions(),
      content: {
        type: "doc",
        content: [
          {
            type: "section",
            attrs: { sectionId: "s1", title: "S" },
            content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }],
          },
        ],
      },
    });
    try {
      expect(headingNumberDecorations(editor.state.doc, DECIMAL)).toHaveLength(0);
    } finally {
      editor.destroy();
    }
  });
});

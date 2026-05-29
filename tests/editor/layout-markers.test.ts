import { Editor as CoreEditor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "../../src/editor/Editor";
import {
  BREAK_BEFORE_CLASS,
  layoutMarkerDecorations,
} from "../../src/editor/extensions/LayoutMarkers";

function heading(text: string, breakBefore = false, spaceBefore: number | null = null) {
  return {
    type: "heading",
    attrs: { blockId: `h-${text}`, level: 2, numbered: true, note: "", breakBefore, spaceBefore },
    content: [{ type: "text", text }],
  };
}

function styleOf(decoration: unknown): string | undefined {
  return (decoration as { type: { attrs: { style?: string } } }).type.attrs.style;
}

function editorWith(headings: object[]): CoreEditor {
  return new CoreEditor({
    extensions: createEditorExtensions(),
    content: {
      type: "doc",
      content: [{ type: "section", attrs: { sectionId: "s1", title: "S" }, content: headings }],
    },
  });
}

function blockStarts(doc: PMNode): number[] {
  const starts: number[] = [];
  doc.descendants((_node, pos, parent) => {
    if (parent?.type.name === "section") {
      starts.push(pos);
      return false;
    }
    return true;
  });
  return starts;
}

describe("LayoutMarkers — breakBefore decoration (ADR-0018, item 5)", () => {
  it("decorates only blocks whose breakBefore is set", () => {
    const editor = editorWith([heading("A"), heading("B", true), heading("C")]);
    try {
      const decorations = layoutMarkerDecorations(editor.state.doc);
      const bStart = blockStarts(editor.state.doc)[1];
      expect(decorations).toHaveLength(1);
      expect(decorations[0]?.from).toBe(bStart);
      // The decoration carries the marker class.
      expect(
        (decorations[0] as unknown as { type: { attrs: { class?: string } } }).type.attrs.class,
      ).toBe(BREAK_BEFORE_CLASS);
    } finally {
      editor.destroy();
    }
  });

  it("returns no decorations when no block has breakBefore", () => {
    const editor = editorWith([heading("A"), heading("B")]);
    try {
      expect(layoutMarkerDecorations(editor.state.doc)).toHaveLength(0);
    } finally {
      editor.destroy();
    }
  });

  it("emits a margin-top override for spaceBefore (× spacing unit)", () => {
    const editor = editorWith([heading("A", false, 2)]);
    try {
      const decorations = layoutMarkerDecorations(editor.state.doc, 8);
      expect(decorations).toHaveLength(1);
      expect(styleOf(decorations[0])).toBe("margin-top: 16px");
    } finally {
      editor.destroy();
    }
  });

  it("combines breakBefore class and spaceBefore style on one decoration", () => {
    const editor = editorWith([heading("A", true, 1)]);
    try {
      const decorations = layoutMarkerDecorations(editor.state.doc, 10);
      expect(decorations).toHaveLength(1);
      const attrs = (
        decorations[0] as unknown as { type: { attrs: { class?: string; style?: string } } }
      ).type.attrs;
      expect(attrs.class).toBe(BREAK_BEFORE_CLASS);
      expect(attrs.style).toBe("margin-top: 10px");
    } finally {
      editor.destroy();
    }
  });
});

import { Editor as CoreEditor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "../../src/editor/Editor";
import { setBlockAttr } from "../../src/editor/block-commands";

function makeEditor(): CoreEditor {
  return new CoreEditor({
    extensions: createEditorExtensions(),
    content: {
      type: "doc",
      content: [
        {
          type: "section",
          attrs: { sectionId: "s1", title: "S" },
          content: [
            { type: "heading", attrs: { blockId: "h1", level: 2, numbered: true, note: "" }, content: [{ type: "text", text: "A" }] },
          ],
        },
      ],
    },
  });
}

function firstBlockStart(doc: PMNode): number {
  let start = -1;
  doc.descendants((_node, pos, parent) => {
    if (parent?.type.name === "section" && start === -1) {
      start = pos;
      return false;
    }
    return true;
  });
  return start;
}

describe("setBlockAttr (ADR-0018 layout toggles)", () => {
  it("sets breakBefore on the target block node", () => {
    const editor = makeEditor();
    try {
      const start = firstBlockStart(editor.state.doc);
      const tr = setBlockAttr(editor.state, start, "breakBefore", true);
      expect(tr).not.toBeNull();
      editor.view.dispatch(tr!);
      expect(editor.state.doc.nodeAt(start)?.attrs.breakBefore).toBe(true);
      // (DocModel round-trip of breakBefore is covered by
      // base-block-attrs-roundtrip.test.ts.)
    } finally {
      editor.destroy();
    }
  });

  it("toggles a heading's numbered attr (gutter-menu numbering toggle)", () => {
    const editor = makeEditor();
    try {
      const start = firstBlockStart(editor.state.doc);
      const tr = setBlockAttr(editor.state, start, "numbered", false);
      expect(tr).not.toBeNull();
      editor.view.dispatch(tr!);
      expect(editor.state.doc.nodeAt(start)?.attrs.numbered).toBe(false);
    } finally {
      editor.destroy();
    }
  });

  it("is a no-op when the attr already has the value", () => {
    const editor = makeEditor();
    try {
      const start = firstBlockStart(editor.state.doc);
      // Default breakBefore is false → setting false is a no-op.
      expect(setBlockAttr(editor.state, start, "breakBefore", false)).toBeNull();
    } finally {
      editor.destroy();
    }
  });
});

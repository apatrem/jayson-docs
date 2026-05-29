import { Editor as CoreEditor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import { createEditorExtensions } from "../../src/editor/Editor";
import {
  buildMoveTransaction,
  findTopLevelBlock,
  reorderBlocks,
  sectionContentInsertPos,
} from "../../src/editor/extensions/DragReorder";

function heading(text: string) {
  return {
    type: "heading",
    attrs: { blockId: `h-${text}`, level: 2, numbered: true, note: "" },
    content: [{ type: "text", text }],
  };
}

function section(id: string, headings: object[]) {
  return { type: "section", attrs: { sectionId: id, title: id }, content: headings };
}

function makeEditor(sections: object[]): CoreEditor {
  return new CoreEditor({
    extensions: createEditorExtensions(),
    content: { type: "doc", content: sections },
  });
}

/** Block start positions (direct children of sections) in document order. */
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

/** The heading text of each section, in order — the observable structure. */
function structure(doc: PMNode): string[][] {
  const out: string[][] = [];
  doc.forEach((sectionNode) => {
    if (sectionNode.type.name !== "section") return;
    const texts: string[] = [];
    sectionNode.forEach((block) => texts.push(block.textContent));
    out.push(texts);
  });
  return out;
}

describe("findTopLevelBlock / sectionContentInsertPos", () => {
  it("finds the section-child block containing a position", () => {
    const editor = makeEditor([section("s1", [heading("A"), heading("B")])]);
    try {
      const [startA, startB] = blockStarts(editor.state.doc);
      const blockA = findTopLevelBlock(editor.state.doc, (startA ?? 0) + 1);
      expect(blockA?.start).toBe(startA);
      expect(blockA?.node.textContent).toBe("A");
      const blockB = findTopLevelBlock(editor.state.doc, (startB ?? 0) + 1);
      expect(blockB?.node.textContent).toBe("B");
    } finally {
      editor.destroy();
    }
  });

  it("resolves a position to a section-level boundary (parent = section)", () => {
    const editor = makeEditor([section("s1", [heading("A"), heading("B")])]);
    try {
      const pos = sectionContentInsertPos(editor.state.doc, 2);
      expect(pos).not.toBeNull();
      // The fallback returns a section-level boundary, not an in-block position.
      expect(editor.state.doc.resolve(pos as number).parent.type.name).toBe("section");
    } finally {
      editor.destroy();
    }
  });
});

describe("buildMoveTransaction — within and across sections (ADR-0018, item 3)", () => {
  it("reorders a block within its section", () => {
    const editor = makeEditor([section("s1", [heading("A"), heading("B"), heading("C")])]);
    try {
      const doc = editor.state.doc;
      const a = findTopLevelBlock(doc, (blockStarts(doc)[0] ?? 0) + 1)!;
      const c = findTopLevelBlock(doc, (blockStarts(doc)[2] ?? 0) + 1)!;
      // Move A to after C (end of section).
      const tr = buildMoveTransaction(editor.state, a.start, c.end);
      expect(tr).not.toBeNull();
      editor.view.dispatch(tr!);
      expect(structure(editor.state.doc)).toEqual([["B", "C", "A"]]);
    } finally {
      editor.destroy();
    }
  });

  it("moves a block across sections (source keeps ≥1 block)", () => {
    const editor = makeEditor([
      section("s1", [heading("A"), heading("B")]),
      section("s2", [heading("C"), heading("D")]),
    ]);
    try {
      const doc = editor.state.doc;
      const starts = blockStarts(doc);
      const c = findTopLevelBlock(doc, (starts[2] ?? 0) + 1)!;
      const a = findTopLevelBlock(doc, (starts[0] ?? 0) + 1)!;
      // Move C (section 2) to before A (section 1); s2 still has D.
      const tr = buildMoveTransaction(editor.state, c.start, a.start);
      expect(tr).not.toBeNull();
      editor.view.dispatch(tr!);
      expect(structure(editor.state.doc)).toEqual([["C", "A", "B"], ["D"]]);
    } finally {
      editor.destroy();
    }
  });

  it("rejects a cross-section move that would empty the source section", () => {
    const editor = makeEditor([
      section("s1", [heading("A")]),
      section("s2", [heading("B")]),
    ]);
    try {
      const doc = editor.state.doc;
      const starts = blockStarts(doc);
      const a = findTopLevelBlock(doc, (starts[0] ?? 0) + 1)!;
      const b = findTopLevelBlock(doc, (starts[1] ?? 0) + 1)!;
      // Moving A (s1's only block) into s2 would empty s1 → rejected.
      expect(buildMoveTransaction(editor.state, a.start, b.start)).toBeNull();
    } finally {
      editor.destroy();
    }
  });

  it("rejects an insert that would land at the top level (not inside a section)", () => {
    const editor = makeEditor([section("s1", [heading("A")])]);
    try {
      const a = findTopLevelBlock(editor.state.doc, (blockStarts(editor.state.doc)[0] ?? 0) + 1)!;
      // Position 0 resolves to inside `doc`, whose parent is not a section.
      expect(buildMoveTransaction(editor.state, a.start, 0)).toBeNull();
    } finally {
      editor.destroy();
    }
  });

  it("rejects a drop onto the dragged block itself", () => {
    const editor = makeEditor([section("s1", [heading("A"), heading("B")])]);
    try {
      const a = findTopLevelBlock(editor.state.doc, (blockStarts(editor.state.doc)[0] ?? 0) + 1)!;
      expect(buildMoveTransaction(editor.state, a.start, a.start + 1)).toBeNull();
    } finally {
      editor.destroy();
    }
  });
});

describe("reorderBlocks (pure array helper)", () => {
  it("moves an item and is a no-op for invalid indices", () => {
    expect(reorderBlocks(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(reorderBlocks(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(reorderBlocks(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
    expect(reorderBlocks(["a", "b", "c"], -1, 2)).toEqual(["a", "b", "c"]);
    expect(reorderBlocks(["a", "b", "c"], 0, 9)).toEqual(["a", "b", "c"]);
  });
});

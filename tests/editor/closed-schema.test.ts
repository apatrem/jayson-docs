import { Editor as CoreEditor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_EDITOR_MARK_NAMES,
  ALLOWED_EDITOR_NODE_NAMES,
  allowedEditorNodeNames,
  assertClosedEditorContent,
  createEditorExtensions,
  sanitizePastedHtml,
} from "../../src/editor/Editor";
import type { AuthoredBlockManifest } from "../../src/blocks/authored/defineAuthoredBlock";

// A minimal installed Authored manifest (content: "none" → atom node).
// Its TipTap node name is the slug; its insert command is `insertAuthored_<slug>`;
// its node attrs are blockId, note, and each fieldId.
const sampleManifest: AuthoredBlockManifest = {
  slug: "sector-risk",
  title: "Sector Risk",
  paletteLabel: "Sector Risk",
  content: "none",
  attrs: [{ kind: "string", fieldId: "label", label: "Label" }],
  template: { kind: "text", value: "x" },
};

const authoredDoc = (attrs: Record<string, unknown>) => ({
  type: "doc",
  content: [
    {
      type: "section",
      attrs: { sectionId: "section-1", title: "Section" },
      content: [{ type: "sector-risk", attrs }],
    },
  ],
});

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

describe("closed editor schema with installed authored manifests (ADR-0015)", () => {
  it("registers exactly static blocks ∪ the installed manifest set", () => {
    const editor = new CoreEditor({
      extensions: createEditorExtensions([sampleManifest]),
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
      // Expected set is DERIVED from the same manifests passed to the editor —
      // the allow-list and the registered node set move in lock-step.
      expect(Object.keys(editor.schema.nodes).sort()).toEqual(
        [...allowedEditorNodeNames([sampleManifest])].sort(),
      );
      expect(editor.schema.nodes["sector-risk"]).toBeDefined();
    } finally {
      editor.destroy();
    }
  });

  it("widens the allow-list by exactly the authored slug", () => {
    const base = [...allowedEditorNodeNames()];
    const widened = [...allowedEditorNodeNames([sampleManifest])];
    expect(widened.filter((n) => !base.includes(n))).toEqual(["sector-risk"]);
    // No-arg form is unchanged — backward compatible with today's behavior.
    expect(base).toEqual([...ALLOWED_EDITOR_NODE_NAMES]);
  });

  it("exposes the insertAuthored_<slug> command so the palette button enables", () => {
    const editor = new CoreEditor({
      extensions: createEditorExtensions([sampleManifest]),
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
      const commands = editor.commands as Record<string, unknown>;
      expect(typeof commands["insertAuthored_sector-risk"]).toBe("function");
    } finally {
      editor.destroy();
    }
  });

  it("accepts an authored node and its attrs when its manifest is supplied", () => {
    expect(() =>
      assertClosedEditorContent(
        authoredDoc({ blockId: "b1", note: "", label: "hi" }),
        [sampleManifest],
      ),
    ).not.toThrow();
  });

  it("rejects the authored node when no manifest is supplied (closed by default)", () => {
    expect(() =>
      assertClosedEditorContent(authoredDoc({ blockId: "b1", note: "", label: "hi" })),
    ).toThrow("Unknown editor node type: sector-risk");
  });

  it("rejects an off-schema attr on an authored node", () => {
    expect(() =>
      assertClosedEditorContent(
        authoredDoc({ blockId: "b1", note: "", label: "hi", bogus: 1 }),
        [sampleManifest],
      ),
    ).toThrow('Unknown attr "bogus" on editor node type "sector-risk"');
  });
});

/**
 * tests/editor/empty-heading-serialization.test.ts
 *
 * Regression: the editor's heading node is `content: "text*"`, so a user can
 * insert a heading and never type into it (or empty an existing one).
 * `HeadingBlockSchema` requires `text.min(1)`, so persisting that empty heading
 * used to write a DocModel that threw on the next open
 * (DocModelSchema.parse → too_small at sections[N].blocks[M].text), silently
 * making the document un-openable. A real client doc hit this.
 *
 * The editor→DocModel boundary (proseMirrorToDocModel) now drops headings whose
 * text is empty or whitespace-only. These tests prove:
 *   (a) an editor doc containing empty headings saves to a DocModel that
 *       re-parses via DocModelSchema without throwing, and
 *   (b) non-empty headings (and their siblings) survive with no data loss.
 */

import { describe, it, expect } from "vitest";
import {
  docModelToProseMirror,
  proseMirrorToDocModel,
  type ProseMirrorNode,
} from "../../src/editor/mapping";
import { DocModelSchema, type DocModel } from "../../src/schema/docmodel";
import type { HeadingBlock } from "../../src/blocks/heading/schema";
import type { ProseBlock } from "../../src/blocks/prose/schema";

const meta: DocModel["meta"] = {
  client: "Acme Corp",
  project: "Empty-heading regression",
  docKind: "memo",
  language: "en",
  status: "draft",
  archived: false,
  confidentialityLevel: "medium",
  owner: "test@example.com",
  reviewers: [],
  tags: [],
  createdAt: "2026-05-29T00:00:00.000Z",
  updatedAt: "2026-05-29T00:00:00.000Z",
  brandRef: "$brand:default",
};

const realHeading: HeadingBlock = {
  id: "real-heading",
  type: "heading",
  level: 2,
  text: "Strategic context",
  numbered: true,
};

const proseBlock: ProseBlock = {
  id: "prose-1",
  type: "prose",
  align: "left",
  content: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Body copy." }] },
    ],
  },
};

const baseDoc: DocModel = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta,
  sections: [{ id: "sec-1", blocks: [realHeading, proseBlock] }],
  comments: [],
};

/** A heading PM node the editor produces with no typed text (content: []). */
function emptyHeadingNode(blockId: string): ProseMirrorNode {
  return {
    type: "heading",
    attrs: {
      blockId,
      level: 2,
      numbered: true,
      note: "",
      breakBefore: false,
      spaceBefore: null,
    },
    content: [],
  };
}

/** A heading PM node whose only text is whitespace. */
function whitespaceHeadingNode(blockId: string): ProseMirrorNode {
  return {
    ...emptyHeadingNode(blockId),
    content: [{ type: "text", text: "   " }],
  };
}

/** Inject extra block nodes into the first section of a PM document. */
function withExtraSectionBlocks(
  pm: ReturnType<typeof docModelToProseMirror>,
  extras: ProseMirrorNode[],
): ReturnType<typeof docModelToProseMirror> {
  const [section, ...rest] = pm.content;
  if (section === undefined || !("content" in section)) {
    throw new Error("expected a section node");
  }
  const sectionContent = (section.content ?? []) as ProseMirrorNode[];
  return {
    ...pm,
    content: [
      { ...section, content: [...sectionContent, ...extras] },
      ...rest,
    ],
  };
}

describe("empty heading serialization (editor → DocModel)", () => {
  it("DocModelSchema rejects a heading with empty text (the failure being prevented)", () => {
    const invalid = {
      ...baseDoc,
      sections: [
        { id: "sec-1", blocks: [{ ...realHeading, text: "" }, proseBlock] },
      ],
    };
    const result = DocModelSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      const textIssue = result.error.issues.find(
        (issue) => issue.path.at(-1) === "text" && issue.code === "too_small",
      );
      expect(textIssue, "expected a too_small issue on the heading text").toBeTruthy();
    }
  });

  it("(a) drops empty/whitespace headings so the saved DocModel re-parses without throwing", () => {
    const pm = withExtraSectionBlocks(docModelToProseMirror(baseDoc), [
      emptyHeadingNode("empty-heading"),
      whitespaceHeadingNode("whitespace-heading"),
    ]);

    const saved = proseMirrorToDocModel(pm);

    // The produced DocModel is valid: re-parsing it (the open path) must not throw.
    expect(() => DocModelSchema.parse(saved)).not.toThrow();
  });

  it("(b) preserves non-empty headings and sibling blocks (no data loss)", () => {
    const pm = withExtraSectionBlocks(docModelToProseMirror(baseDoc), [
      emptyHeadingNode("empty-heading"),
      whitespaceHeadingNode("whitespace-heading"),
    ]);

    const saved = proseMirrorToDocModel(pm);
    expect(saved.kind).toBe("document");
    if (saved.kind !== "document") return;

    const blocks = saved.sections[0]?.blocks ?? [];
    // Only the real heading + prose survive; both empties are dropped.
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({
      id: "real-heading",
      type: "heading",
      level: 2,
      text: "Strategic context",
      numbered: true,
    });
    expect(blocks[1]).toMatchObject({ id: "prose-1", type: "prose" });
    // The dropped ids never reach the document.
    const ids = blocks.map((b) => b.id);
    expect(ids).not.toContain("empty-heading");
    expect(ids).not.toContain("whitespace-heading");
  });
});

import { describe, expect, it } from "vitest";
import {
  createSection,
  deleteSection,
  moveSection,
  renameSection,
  type DocumentModel,
} from "../../src/docmodel/section-ops";
import { DocModelSchema } from "../../src/schema/docmodel";

function proseBlock(id: string, text: string) {
  return {
    id,
    type: "prose" as const,
    align: "left" as const,
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] },
  };
}

function baseDoc(): DocumentModel {
  const doc = {
    kind: "document",
    schemaVersion: "1.0.0",
    meta: {
      client: "Acme",
      project: "Sections",
      docKind: "report",
      tags: [],
      language: "en",
      status: "draft",
      archived: false,
      confidentialityLevel: "medium",
      owner: "owner@example.com",
      reviewers: [],
      createdAt: "2026-05-26T00:00:00Z",
      updatedAt: "2026-05-26T00:00:00Z",
      brandRef: "$brand:default",
    },
    sections: [
      { id: "sec-a", title: "Alpha", blocks: [proseBlock("a1", "A body")] },
      { id: "sec-b", title: "Beta", blocks: [proseBlock("b1", "B body")] },
    ],
    comments: [],
  };
  const parsed = DocModelSchema.parse(doc);
  if (parsed.kind !== "document") throw new Error("expected document");
  return parsed;
}

const titles = (doc: DocumentModel): (string | undefined)[] =>
  doc.sections.map((section) => section.title);
const ids = (doc: DocumentModel): string[] => doc.sections.map((section) => section.id);

describe("section-ops (ADR-0018, item 1)", () => {
  it("moveSection reorders and stays valid", () => {
    const next = moveSection(baseDoc(), 0, 1);
    expect(ids(next)).toEqual(["sec-b", "sec-a"]);
    expect(() => DocModelSchema.parse(next)).not.toThrow();
  });

  it("moveSection is a no-op for invalid indices", () => {
    const doc = baseDoc();
    expect(moveSection(doc, 0, 9)).toBe(doc);
    expect(moveSection(doc, 0, 0)).toBe(doc);
  });

  it("renameSection sets and clears the title", () => {
    const renamed = renameSection(baseDoc(), "sec-a", "  Executive Summary  ");
    expect(titles(renamed)).toEqual(["Executive Summary", "Beta"]);
    const cleared = renameSection(renamed, "sec-a", "   ");
    expect(titles(cleared)).toEqual([undefined, "Beta"]);
    expect(() => DocModelSchema.parse(cleared)).not.toThrow();
  });

  it("createSection inserts after the given index with one empty block", () => {
    const next = createSection(baseDoc(), {
      sectionId: "sec-new",
      blockId: "blk-new",
      afterIndex: 0,
      title: "Inserted",
    });
    expect(ids(next)).toEqual(["sec-a", "sec-new", "sec-b"]);
    const inserted = next.sections[1];
    expect(inserted?.blocks).toHaveLength(1);
    expect(inserted?.blocks[0]?.type).toBe("prose");
    expect(() => DocModelSchema.parse(next)).not.toThrow();
  });

  it("createSection appends when afterIndex is omitted", () => {
    const next = createSection(baseDoc(), { sectionId: "sec-z", blockId: "blk-z" });
    expect(ids(next)).toEqual(["sec-a", "sec-b", "sec-z"]);
  });

  it("deleteSection removes a section but never the last one", () => {
    const afterDelete = deleteSection(baseDoc(), "sec-a");
    expect(ids(afterDelete)).toEqual(["sec-b"]);
    expect(() => DocModelSchema.parse(afterDelete)).not.toThrow();
    // Now only one section remains → delete is a no-op.
    expect(deleteSection(afterDelete, "sec-b")).toBe(afterDelete);
  });
});

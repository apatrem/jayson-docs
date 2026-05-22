import { describe, it, expect } from "vitest";
import { DocModelSchema } from "../../src/schema/docmodel";

const meta = {
  client: "Test Client",
  project: "Test",
  docKind: "memo" as const,
  language: "en" as const,
  status: "draft" as const,
  owner: "test@example.com",
  createdAt: "2026-05-21T00:00:00Z",
  updatedAt: "2026-05-21T00:00:00Z",
};

const proseBlock = {
  id: "b1-prose-01",
  type: "prose" as const,
  content: {
    type: "doc" as const,
    content: [{ type: "paragraph" as const, content: [{ type: "text" as const, text: "Hi" }] }],
  },
};

describe("DocModelSchema", () => {
  it("requires sections for kind document", () => {
    const doc = DocModelSchema.parse({
      kind: "document",
      schemaVersion: "1.0.0",
      meta,
      sections: [{ id: "sec-01", blocks: [proseBlock] }],
    });
    expect(doc.kind).toBe("document");
    expect(doc.comments).toEqual([]);
  });

  it("rejects document without sections", () => {
    expect(
      DocModelSchema.safeParse({
        kind: "document",
        schemaVersion: "1.0.0",
        meta,
        sections: [],
      }).success,
    ).toBe(false);
  });

  it("requires slides for kind deck", () => {
    const deck = DocModelSchema.parse({
      kind: "deck",
      schemaVersion: "1.0.0",
      meta: { ...meta, docKind: "deck" as const },
      slides: [{ id: "slide-01", layout: "cover", blocks: [] }],
    });
    expect(deck.kind).toBe("deck");
    if (deck.kind === "deck") {
      expect(deck.slides).toHaveLength(1);
    }
  });

  it("rejects deck without slides", () => {
    expect(
      DocModelSchema.safeParse({
        kind: "deck",
        schemaVersion: "1.0.0",
        meta: { ...meta, docKind: "deck" as const },
        slides: [],
      }).success,
    ).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    expect(
      DocModelSchema.safeParse({
        kind: "document",
        schemaVersion: "2.0.0",
        meta,
        sections: [{ id: "sec-01", blocks: [proseBlock] }],
      }).success,
    ).toBe(false);
  });
});

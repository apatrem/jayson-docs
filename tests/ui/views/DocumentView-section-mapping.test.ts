import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  documentToEditorContent,
  editorContentToDocument,
} from "../../../src/ui/views/DocumentView";
import { DocModelSchema } from "../../../src/schema/docmodel";

describe("DocumentView section-aware mapping (T-180)", () => {
  it("round-trips examples/sample-proposal.yaml without changing section membership", () => {
    const doc = DocModelSchema.parse(
      parse(readFileSync("examples/sample-proposal.yaml", "utf8")),
    );
    if (doc.kind !== "document") {
      throw new Error("fixture must be a document");
    }

    const editorJson = documentToEditorContent(doc);
    expect(editorJson.content?.every((node) => node.type === "section")).toBe(true);
    expect(editorJson.content?.length).toBe(doc.sections.length);

    expect(editorContentToDocument(doc, editorJson)).toEqual(doc);
  });

  it("keeps block insertions inside the edited section on save", () => {
    const doc = DocModelSchema.parse(
      parse(readFileSync("examples/sample-proposal.yaml", "utf8")),
    );
    if (doc.kind !== "document") {
      throw new Error("fixture must be a document");
    }

    const editorJson = documentToEditorContent(doc);
    const firstSection = editorJson.content?.[0];
    if (firstSection === undefined || firstSection.type !== "section") {
      throw new Error("expected first editor child to be a section");
    }

    const inserted = {
      type: "callout",
      attrs: {
        blockId: "new-callout-in-section-1",
        variant: "info",
        title: "Inserted",
      },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "New callout body" }],
        },
      ],
    };

    firstSection.content = [...(firstSection.content ?? []), inserted];

    const saved = editorContentToDocument(doc, editorJson);
    expect(saved.sections[0]!.blocks).toHaveLength(doc.sections[0]!.blocks.length + 1);
    expect(saved.sections[0]!.blocks.at(-1)?.type).toBe("callout");
    expect(saved.sections[1]!.blocks).toEqual(doc.sections[1]!.blocks);
  });
});

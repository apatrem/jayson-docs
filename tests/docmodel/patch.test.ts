import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  applyPatch,
  BlockPatchApplicationError,
  BlockPatchValidationError,
} from "../../src/docmodel/patch";
import type { BlockPatch } from "../../src/schema/block-patch";
import type { Block } from "../../src/schema/blocks";
import type { DocModel } from "../../src/schema/docmodel";
import { validateDocModel } from "../../src/schema/validate";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const doc = loadValidDoc();
const patchFixture = JSON.parse(
  readFileSync(join(repoRoot, "examples/sample-block-patch.json"), "utf8"),
) as {
  _replace_example: Extract<BlockPatch, { op: "replace" }>;
  _remove_example: Extract<BlockPatch, { op: "remove" }>;
  _insert_after_example: Extract<BlockPatch, { op: "insert-after" }>;
};

describe("applyPatch (T-63)", () => {
  it("replaces only the target block and leaves all others byte-identical", () => {
    const beforeBlocks = blocksById(doc);
    const updated = applyPatch(doc, patchFixture._replace_example);
    const afterBlocks = blocksById(updated);

    expect(afterBlocks.get("b1-callout-01")).toMatchObject({
      id: "b1-callout-01",
      type: "callout",
      title: "Why now (concise)",
    });
    for (const [id, before] of beforeBlocks) {
      if (id !== "b1-callout-01") {
        expect(JSON.stringify(afterBlocks.get(id))).toBe(JSON.stringify(before));
      }
    }
  });

  it("inserts a schema-valid block after the target block", () => {
    const updated = applyPatch(doc, patchFixture._insert_after_example);
    const section = getDocumentSection(updated, "Context & objectives");
    const targetIndex = section.blocks.findIndex(
      (block) => block.id === "b2-bullets-01",
    );

    expect(section.blocks[targetIndex + 1]).toMatchObject({
      id: "b2-callout-new",
      type: "callout",
      title: "Regulatory note",
    });
    expect(validateDocModel(updated).ok).toBe(true);
  });

  it("removes the target block without touching siblings", () => {
    const updated = applyPatch(doc, {
      op: "remove",
      blockId: "b1-callout-01",
    });
    const afterBlocks = blocksById(updated);

    expect(afterBlocks.has("b1-callout-01")).toBe(false);
    expect(afterBlocks.get("b1-prose-01")).toEqual(
      blocksById(doc).get("b1-prose-01"),
    );
  });

  it("rejects a patch whose target block is missing", () => {
    expect(() =>
      applyPatch(doc, {
        op: "remove",
        blockId: "missing-block",
      }),
    ).toThrow(BlockPatchApplicationError);
  });

  it("rejects a replacement whose block id does not match the target", () => {
    const patch = {
      ...patchFixture._replace_example,
      block: { ...patchFixture._replace_example.block, id: "different-id" },
    };

    expect(() => applyPatch(doc, patch)).toThrow(BlockPatchApplicationError);
  });

  it("rejects off-schema replacement blocks before application", () => {
    const patch = {
      ...patchFixture._replace_example,
      block: {
        id: "b1-callout-01",
        type: "heading",
        level: 2,
      },
    };

    expect(() => applyPatch(doc, patch)).toThrow();
  });

  it("rejects final documents that would violate DocModel invariants", () => {
    if (doc.kind !== "document") {
      throw new Error("sample fixture must be a document");
    }
    const onlyBlockSectionDoc: DocModel = {
      ...doc,
      sections: [
        {
          id: "single-section",
          title: "One block",
          blocks: [getRequiredBlock(doc, "b1-prose-01")],
        },
      ],
    };

    expect(() =>
      applyPatch(onlyBlockSectionDoc, {
        op: "remove",
        blockId: "b1-prose-01",
      }),
    ).toThrow(BlockPatchValidationError);
  });
});

function loadValidDoc(): DocModel {
  const parsed = parse(
    readFileSync(join(repoRoot, "examples/sample-proposal.yaml"), "utf8"),
  ) as unknown;
  const validation = validateDocModel(parsed);
  if (!validation.ok) {
    throw new Error("sample-proposal.yaml should validate");
  }
  return validation.doc;
}

function blocksById(input: DocModel): Map<string, Block> {
  const blocks = new Map<string, Block>();
  if (input.kind === "document") {
    for (const section of input.sections) {
      for (const block of section.blocks) {
        blocks.set(block.id, block);
      }
    }
  } else {
    for (const slide of input.slides) {
      for (const block of slide.blocks) {
        blocks.set(block.id, block);
      }
    }
  }
  return blocks;
}

function getDocumentSection(input: DocModel, title: string) {
  if (input.kind !== "document") {
    throw new Error("expected document");
  }
  const section = input.sections.find((candidate) => candidate.title === title);
  if (section === undefined) {
    throw new Error(`missing section ${title}`);
  }
  return section;
}

function getRequiredBlock(input: DocModel, blockId: string): Block {
  const block = blocksById(input).get(blockId);
  if (block === undefined) {
    throw new Error(`missing block ${blockId}`);
  }
  return block;
}

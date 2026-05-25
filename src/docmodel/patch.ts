import { BlockPatchSchema, type BlockPatch } from "../schema/block-patch";
import { BlockSchema, type Block } from "../schema/blocks";
import type { DocModel } from "../schema/docmodel";
import { validateDocModel, type ValidationError } from "../schema/validate";

export class BlockPatchApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlockPatchApplicationError";
  }
}

export class BlockPatchValidationError extends Error {
  constructor(readonly errors: ValidationError[]) {
    super(
      `Patched DocModel failed validation: ${errors
        .map((error) => `${error.path || "<root>"} ${error.message}`)
        .join("; ")}`,
    );
    this.name = "BlockPatchValidationError";
  }
}

export function applyPatch(doc: DocModel, input: unknown): DocModel {
  const patch = BlockPatchSchema.parse(input);
  const updated = applyValidatedPatch(doc, patch);
  const validation = validateDocModel(updated);
  if (!validation.ok) {
    throw new BlockPatchValidationError(validation.errors);
  }
  return validation.doc;
}

function applyValidatedPatch(doc: DocModel, patch: BlockPatch): DocModel {
  switch (patch.op) {
    case "replace":
      return replaceBlock(doc, patch.blockId, parsePatchBlock(patch.block));
    case "remove":
      return removeBlock(doc, patch.blockId);
    case "insert-after":
      return insertBlockAfter(
        doc,
        patch.afterBlockId,
        parsePatchBlock(patch.block),
      );
  }
}

function replaceBlock(doc: DocModel, blockId: string, block: Block): DocModel {
  if (block.id !== blockId) {
    throw new BlockPatchApplicationError(
      `Replacement block id '${block.id}' does not match target '${blockId}'.`,
    );
  }
  return updateBlocks(doc, blockId, (blocks, index) => [
    ...blocks.slice(0, index),
    block,
    ...blocks.slice(index + 1),
  ]);
}

function removeBlock(doc: DocModel, blockId: string): DocModel {
  return updateBlocks(doc, blockId, (blocks, index) => [
    ...blocks.slice(0, index),
    ...blocks.slice(index + 1),
  ]);
}

function insertBlockAfter(
  doc: DocModel,
  afterBlockId: string,
  block: Block,
): DocModel {
  return updateBlocks(doc, afterBlockId, (blocks, index) => [
    ...blocks.slice(0, index + 1),
    block,
    ...blocks.slice(index + 1),
  ]);
}

function updateBlocks(
  doc: DocModel,
  targetBlockId: string,
  update: (blocks: Block[], index: number) => Block[],
): DocModel {
  if (doc.kind === "document") {
    const sectionIndex = doc.sections.findIndex((section) =>
      section.blocks.some((block) => block.id === targetBlockId),
    );
    if (sectionIndex === -1) {
      throw new BlockPatchApplicationError(
        `Block '${targetBlockId}' was not found.`,
      );
    }
    const section = doc.sections[sectionIndex];
    if (section === undefined) {
      throw new BlockPatchApplicationError(
        `Block '${targetBlockId}' was not found.`,
      );
    }
    const blockIndex = section.blocks.findIndex(
      (block) => block.id === targetBlockId,
    );
    return {
      ...doc,
      sections: doc.sections.map((candidate, index) =>
        index === sectionIndex
          ? { ...candidate, blocks: update(candidate.blocks, blockIndex) }
          : candidate,
      ),
    };
  }

  const slideIndex = doc.slides.findIndex((slide) =>
    slide.blocks.some((block) => block.id === targetBlockId),
  );
  if (slideIndex === -1) {
    throw new BlockPatchApplicationError(`Block '${targetBlockId}' was not found.`);
  }
  const slide = doc.slides[slideIndex];
  if (slide === undefined) {
    throw new BlockPatchApplicationError(`Block '${targetBlockId}' was not found.`);
  }
  const blockIndex = slide.blocks.findIndex((block) => block.id === targetBlockId);
  return {
    ...doc,
    slides: doc.slides.map((candidate, index) =>
      index === slideIndex
        ? { ...candidate, blocks: update(candidate.blocks, blockIndex) }
        : candidate,
    ),
  };
}

function parsePatchBlock(block: unknown): Block {
  return BlockSchema.parse(block);
}

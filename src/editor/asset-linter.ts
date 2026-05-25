import type { Block } from "../schema/blocks";
import type { DocModel } from "../schema/docmodel";

export type AssetLintIssueKind = "missing-asset" | "orphaned-asset";

export interface AssetLintIssue {
  kind: AssetLintIssueKind;
  path: string;
  blockId?: string;
  message: string;
}

export interface AssetLintResult {
  issues: AssetLintIssue[];
  missing: AssetLintIssue[];
  orphaned: AssetLintIssue[];
}

export function lintDocAssets(
  doc: DocModel,
  existingAssetPaths: string[],
): AssetLintResult {
  const existing = new Set(existingAssetPaths.filter((path) => path.startsWith("assets/")));
  const references = assetReferences(doc);
  const referencedPaths = new Set(references.map((reference) => reference.path));

  const missing = references
    .filter((reference) => !existing.has(reference.path))
    .map<AssetLintIssue>((reference) => ({
      kind: "missing-asset",
      path: reference.path,
      blockId: reference.blockId,
      message: `Missing asset ${reference.path}`,
    }));
  const orphaned = [...existing]
    .filter((path) => !referencedPaths.has(path))
    .map<AssetLintIssue>((path) => ({
      kind: "orphaned-asset",
      path,
      message: `Orphaned asset ${path}`,
    }));
  return {
    issues: [...missing, ...orphaned],
    missing,
    orphaned,
  };
}

export function assetReferences(doc: DocModel): Array<{ path: string; blockId: string }> {
  return blocksInDoc(doc).flatMap(referencesInBlock);
}

function blocksInDoc(doc: DocModel): Block[] {
  return doc.kind === "document"
    ? doc.sections.flatMap((section) => section.blocks)
    : doc.slides.flatMap((slide) => slide.blocks);
}

function referencesInBlock(block: Block): Array<{ path: string; blockId: string }> {
  switch (block.type) {
    case "image":
      return perDocAsset(block.src) === null
        ? []
        : [{ path: block.src, blockId: block.id }];
    case "team":
      return block.members.flatMap((member) => {
        const photo = member.photo === undefined ? null : perDocAsset(member.photo);
        return photo === null ? [] : [{ path: photo, blockId: block.id }];
      });
    default:
      return [];
  }
}

function perDocAsset(path: string): string | null {
  return path.startsWith("assets/") ? path : null;
}

import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const GENERATED_BLOCKS_DIR = "generated-blocks";
export const GENERATED_BLOCKS_ACTIVE = "active";
export const GENERATED_BLOCKS_PENDING = "pending";

export interface GeneratedBlockPaths {
  installRoot: string;
  activeDir: string;
  pendingDir: string;
}

export interface GeneratedBlockDescriptor {
  blockId: string;
  directory: string;
  schemaPath: string;
}

export interface LoadGeneratedBlocksResult {
  blocks: GeneratedBlockDescriptor[];
  pendingSkipped: GeneratedBlockDescriptor[];
}

export function resolveGeneratedBlockPaths(
  installRoot: string,
): GeneratedBlockPaths {
  const generatedRoot = join(installRoot, GENERATED_BLOCKS_DIR);
  return {
    installRoot,
    activeDir: join(generatedRoot, GENERATED_BLOCKS_ACTIVE),
    pendingDir: join(generatedRoot, GENERATED_BLOCKS_PENDING),
  };
}

export function isUnderPendingDir(absolutePath: string): boolean {
  const normalized = absolutePath.replace(/\\/g, "/");
  return normalized.includes(`/${GENERATED_BLOCKS_PENDING}/`);
}

export function isUnderActiveDir(absolutePath: string): boolean {
  const normalized = absolutePath.replace(/\\/g, "/");
  return normalized.includes(`/${GENERATED_BLOCKS_ACTIVE}/`);
}

/** Reject any path that resolves inside pending/ — D-09 review gate. */
export function assertActiveGeneratedBlockPath(blockDirectory: string): void {
  if (isUnderPendingDir(blockDirectory)) {
    throw new Error(
      `refusing to load generated block from pending/: ${blockDirectory}`,
    );
  }
}

function listBlockDirectories(parentDir: string): string[] {
  if (!existsSync(parentDir)) {
    return [];
  }

  return readdirSync(parentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => join(parentDir, entry.name));
}

function toDescriptor(blockDirectory: string): GeneratedBlockDescriptor | null {
  const blockId = blockDirectory.split(/[/\\]/).pop();
  if (!blockId) {
    return null;
  }

  const schemaPath = join(blockDirectory, "schema.ts");
  if (!existsSync(schemaPath) || !statSync(schemaPath).isFile()) {
    return null;
  }

  return { blockId, directory: blockDirectory, schemaPath };
}

export function discoverGeneratedBlocksInDirectory(
  directory: string,
): GeneratedBlockDescriptor[] {
  return listBlockDirectories(directory)
    .map((dir) => toDescriptor(dir))
    .filter((d): d is GeneratedBlockDescriptor => d !== null)
    .sort((a, b) => a.blockId.localeCompare(b.blockId));
}

/**
 * Load generated block descriptors from `generated-blocks/active/` only.
 * Blocks under `generated-blocks/pending/` are enumerated separately and never
 * included in `blocks`.
 */
export function loadGeneratedBlocks(
  installRoot: string,
): LoadGeneratedBlocksResult {
  const paths = resolveGeneratedBlockPaths(installRoot);
  const pendingSkipped = discoverGeneratedBlocksInDirectory(paths.pendingDir);
  const blocks = discoverGeneratedBlocksInDirectory(paths.activeDir);

  for (const block of blocks) {
    assertActiveGeneratedBlockPath(block.directory);
  }

  return { blocks, pendingSkipped };
}

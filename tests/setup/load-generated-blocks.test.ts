import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  assertActiveGeneratedBlockPath,
  discoverGeneratedBlocksInDirectory,
  loadGeneratedBlocks,
} from "../../src/setup/load-generated-blocks";

function writeBlock(
  blockDir: string,
  blockId: string,
): void {
  mkdirSync(blockDir, { recursive: true });
  writeFileSync(
    join(blockDir, "schema.ts"),
    `export const ${blockId.replace(/-/g, "")}BlockSchema = {};`,
    "utf8",
  );
}

describe("loadGeneratedBlocks", () => {
  it("loads only blocks from generated-blocks/active/", () => {
    const installRoot = mkdtempSync(join(tmpdir(), "gen-blocks-install-"));
    const activeDir = join(
      installRoot,
      "generated-blocks/active/approved-block",
    );
    const pendingDir = join(
      installRoot,
      "generated-blocks/pending/rejected-block",
    );

    writeBlock(activeDir, "approved-block");
    writeBlock(pendingDir, "rejected-block");

    const result = loadGeneratedBlocks(installRoot);

    expect(result.blocks.map((b) => b.blockId)).toEqual(["approved-block"]);
    expect(result.pendingSkipped.map((b) => b.blockId)).toEqual([
      "rejected-block",
    ]);
  });

  it("refuses to treat a pending path as loadable", () => {
    const pendingPath = join(
      "/tmp/install",
      "generated-blocks/pending/evil-block",
    );
    expect(() => assertActiveGeneratedBlockPath(pendingPath)).toThrow(
      /refusing to load generated block from pending/,
    );
  });

  it("does not discover pending blocks when scanning active only", () => {
    const installRoot = mkdtempSync(join(tmpdir(), "gen-blocks-active-only-"));
    const activeRoot = join(installRoot, "generated-blocks/active");
    writeBlock(join(activeRoot, "only-active"), "only-active");

    const active = discoverGeneratedBlocksInDirectory(activeRoot);
    expect(active.map((b) => b.blockId)).toEqual(["only-active"]);
  });
});

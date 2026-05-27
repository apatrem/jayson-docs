/**
 * Tests for runtime-registry.ts — specifically the loader functions added or
 * extended in T-168 (soft-archive folder support).
 *
 * `loadBrandBlockPaletteItems` and `loadAuthoredBlockEntries` both dynamically
 * import `@tauri-apps/api/core`; we mock that module so the functions can be
 * tested without a running Tauri process.
 */

/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock @tauri-apps/api/core ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockInvoke = vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<any>>();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (cmd: string, args?: Record<string, unknown>) => mockInvoke(cmd, args),
}));

// Import AFTER the mock is registered.
import {
  loadBrandBlockPaletteItems,
  loadAuthoredBlockEntries,
} from "../../src/blocks/runtime-registry";

type IpcEntry = { name: string; path: string; is_dir: boolean };

/** Helper: build a file entry for a given filename. */
function fileEntry(name: string, dir: string): IpcEntry {
  return { name, path: `${dir}/${name}`, is_dir: false };
}

/** Helper: build a directory entry. */
function dirEntry(name: string, parent: string): IpcEntry {
  return { name, path: `${parent}/${name}`, is_dir: true };
}

describe("loadBrandBlockPaletteItems", () => {
  const root = "/Users/me/Dropbox";

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("returns empty array when active/ directory is missing", async () => {
    mockInvoke.mockRejectedValueOnce(new Error("NotFound"));
    const result = await loadBrandBlockPaletteItems(root);
    expect(result).toEqual([]);
  });

  it("returns Authored items from active/ tagged folder: 'active'", async () => {
    const activeDir = `${root}/generated-blocks/active`;
    mockInvoke.mockImplementation((cmd, args) => {
      if (cmd === "list_directory" && args?.["path"] === activeDir) {
        return Promise.resolve([fileEntry("my-block.tsx", activeDir)]);
      }
      return Promise.reject(new Error(`unexpected invoke: ${cmd}`));
    });

    const result = await loadBrandBlockPaletteItems(root);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "authored:my-block",
      folder: "active",
      generated: true,
    });
  });

  it("does not tag Brand block directory entries with folder", async () => {
    const activeDir = `${root}/generated-blocks/active`;
    const brandDirPath = `${activeDir}/sector-summary`;
    mockInvoke.mockImplementation((cmd, args) => {
      const path = args?.["path"] as string | undefined;
      if (cmd === "list_directory" && path === activeDir) {
        return Promise.resolve([dirEntry("sector-summary", activeDir)]);
      }
      if (cmd === "file_exists" && path === `${brandDirPath}/schema.ts`) {
        return Promise.resolve(true);
      }
      return Promise.reject(new Error(`unexpected invoke: ${cmd} ${path ?? ""}`));
    });

    const result = await loadBrandBlockPaletteItems(root);

    expect(result).toHaveLength(1);
    expect(result[0]?.folder).toBeUndefined();
    expect(result[0]?.id).toBe("sector-summary");
  });

  it("ignores sidecar .manifest.json files in active/", async () => {
    const activeDir = `${root}/generated-blocks/active`;
    mockInvoke.mockImplementation((cmd, args) => {
      if (cmd === "list_directory" && args?.["path"] === activeDir) {
        return Promise.resolve([
          fileEntry("my-block.tsx", activeDir),
          fileEntry("my-block.tsx.manifest.json", activeDir),
        ]);
      }
      return Promise.reject(new Error(`unexpected invoke: ${cmd}`));
    });

    const result = await loadBrandBlockPaletteItems(root);
    // Only the .tsx file should produce a palette item.
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("authored:my-block");
  });
});

describe("loadAuthoredBlockEntries (T-168)", () => {
  const root = "/Users/me/Dropbox";

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it("returns empty array when both directories are missing", async () => {
    mockInvoke.mockRejectedValue(new Error("NotFound"));
    const result = await loadAuthoredBlockEntries(root);
    expect(result).toEqual([]);
  });

  it("returns only active/ items when archived/ is missing", async () => {
    const activeDir = `${root}/generated-blocks/active`;
    mockInvoke.mockImplementation((cmd, args) => {
      const path = args?.["path"] as string | undefined;
      if (cmd === "list_directory" && path === activeDir) {
        return Promise.resolve([fileEntry("block-a.tsx", activeDir)]);
      }
      // archived/ list throws (directory doesn't exist yet)
      return Promise.reject(new Error("NotFound"));
    });

    const result = await loadAuthoredBlockEntries(root);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "authored:block-a", folder: "active" });
  });

  it("returns items from both active/ and archived/ with correct folder tags", async () => {
    const activeDir = `${root}/generated-blocks/active`;
    const archivedDir = `${root}/generated-blocks/archived`;
    mockInvoke.mockImplementation((cmd, args) => {
      const path = args?.["path"] as string | undefined;
      if (cmd === "list_directory" && path === activeDir) {
        return Promise.resolve([fileEntry("block-a.tsx", activeDir)]);
      }
      if (cmd === "list_directory" && path === archivedDir) {
        return Promise.resolve([fileEntry("old-block.tsx", archivedDir)]);
      }
      return Promise.reject(new Error(`unexpected invoke: ${cmd} ${path ?? ""}`));
    });

    const result = await loadAuthoredBlockEntries(root);
    expect(result).toHaveLength(2);

    const activeItem = result.find((i) => i.id === "authored:block-a");
    const archivedItem = result.find((i) => i.id === "authored:old-block");

    expect(activeItem?.folder).toBe("active");
    expect(archivedItem?.folder).toBe("archived");
  });

  it("skips sidecar .manifest.json files in both folders", async () => {
    const activeDir = `${root}/generated-blocks/active`;
    const archivedDir = `${root}/generated-blocks/archived`;
    mockInvoke.mockImplementation((cmd, args) => {
      const path = args?.["path"] as string | undefined;
      if (cmd === "list_directory" && path === activeDir) {
        return Promise.resolve([
          fileEntry("block.tsx", activeDir),
          fileEntry("block.tsx.manifest.json", activeDir),
        ]);
      }
      if (cmd === "list_directory" && path === archivedDir) {
        return Promise.resolve([fileEntry("old.tsx.manifest.json", archivedDir)]);
      }
      return Promise.reject(new Error(`unexpected invoke: ${cmd}`));
    });

    const result = await loadAuthoredBlockEntries(root);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("authored:block");
  });

  it("skips dot-files and directories in both folders", async () => {
    const activeDir = `${root}/generated-blocks/active`;
    const archivedDir = `${root}/generated-blocks/archived`;
    mockInvoke.mockImplementation((cmd, args) => {
      const path = args?.["path"] as string | undefined;
      if (cmd === "list_directory" && path === activeDir) {
        return Promise.resolve([
          fileEntry(".gitkeep", activeDir),
          dirEntry("brand-dir", activeDir),
          fileEntry("real-block.tsx", activeDir),
        ]);
      }
      if (cmd === "list_directory" && path === archivedDir) {
        return Promise.resolve([fileEntry(".gitkeep", archivedDir)]);
      }
      return Promise.reject(new Error(`unexpected invoke: ${cmd}`));
    });

    const result = await loadAuthoredBlockEntries(root);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("authored:real-block");
  });

  it("returns results sorted by id", async () => {
    const activeDir = `${root}/generated-blocks/active`;
    const archivedDir = `${root}/generated-blocks/archived`;
    mockInvoke.mockImplementation((cmd, args) => {
      const path = args?.["path"] as string | undefined;
      if (cmd === "list_directory" && path === activeDir) {
        return Promise.resolve([
          fileEntry("zebra-block.tsx", activeDir),
          fileEntry("alpha-block.tsx", activeDir),
        ]);
      }
      if (cmd === "list_directory" && path === archivedDir) {
        return Promise.resolve([fileEntry("middle-block.tsx", archivedDir)]);
      }
      return Promise.reject(new Error(`unexpected invoke: ${cmd}`));
    });

    const result = await loadAuthoredBlockEntries(root);
    expect(result.map((i) => i.id)).toEqual([
      "authored:alpha-block",
      "authored:middle-block",
      "authored:zebra-block",
    ]);
  });

  it("handles cloudSyncRoot with trailing slash correctly", async () => {
    const rootWithSlash = `${root}/`;
    const activeDir = `${root}/generated-blocks/active`;
    mockInvoke.mockImplementation((cmd, args) => {
      if (cmd === "list_directory" && args?.["path"] === activeDir) {
        return Promise.resolve([fileEntry("block.tsx", activeDir)]);
      }
      return Promise.reject(new Error("NotFound"));
    });

    const result = await loadAuthoredBlockEntries(rootWithSlash);
    expect(result).toHaveLength(1);
    expect(result[0]?.folder).toBe("active");
  });
});

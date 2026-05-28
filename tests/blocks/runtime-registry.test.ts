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
  loadAuthoredManifests,
} from "../../src/blocks/runtime-registry";
import type { AuthoredBlockManifest } from "../../src/blocks/authored/defineAuthoredBlock";

type IpcEntry = { name: string; path: string; is_dir: boolean };

/** Helper: a minimal valid Extracted-manifest JSON string (the sidecar). */
function manifestJson(slug: string, overrides: Partial<AuthoredBlockManifest> = {}): string {
  return JSON.stringify({
    slug,
    title: `${slug} title`,
    paletteLabel: slug,
    content: "none",
    attrs: [],
    template: { kind: "text", value: "hello" },
    ...overrides,
  });
}

/** Helper: a .tsx source carrying a valid Manifest header (sender lives here). */
function tsxWithHeader(slug: string, sender: string): string {
  return [
    "/**",
    " * authored-block-header: 1",
    " * scaffold-version: 1.0.0",
    ` * sender: ${sender}`,
    " * timestamp: 2026-05-28T00:00:00Z",
    ` * slug: ${slug}`,
    " */",
    "export default {};",
  ].join("\n");
}

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

describe("loadAuthoredManifests — the Installed manifest set (ADR-0015 / ADR-0016)", () => {
  const root = "/Users/me/Dropbox";
  const activeDir = `${root}/generated-blocks/active`;
  const archivedDir = `${root}/generated-blocks/archived`;
  const sender = "alice@firm.example";

  beforeEach(() => {
    mockInvoke.mockReset();
  });

  /**
   * Builds a mockInvoke implementation from a per-folder map of
   * filename → { manifest?: string; tsx?: string }. A missing field means that
   * read rejects (simulating a missing/unreadable file).
   */
  function mockFs(
    folders: Partial<
      Record<"active" | "archived", Record<string, { manifest?: string; tsx?: string }>>
    >,
  ): void {
    const dirOf = { active: activeDir, archived: archivedDir };
    mockInvoke.mockImplementation((cmd, args) => {
      const path = args?.["path"] as string | undefined;
      for (const folder of ["active", "archived"] as const) {
        const files = folders[folder];
        const dir = dirOf[folder];
        if (cmd === "list_directory" && path === dir) {
          if (files === undefined) return Promise.reject(new Error("NotFound"));
          return Promise.resolve(Object.keys(files).map((name) => fileEntry(name, dir)));
        }
        if (cmd === "read_authored_block_file" && files !== undefined) {
          for (const [name, content] of Object.entries(files)) {
            if (path === `${dir}/${name}` && content.tsx !== undefined) {
              return Promise.resolve(content.tsx);
            }
            if (path === `${dir}/${name}.manifest.json` && content.manifest !== undefined) {
              return Promise.resolve(content.manifest);
            }
          }
        }
      }
      return Promise.reject(new Error(`unexpected/NotFound: ${cmd} ${path ?? ""}`));
    });
  }

  it("returns empty array when both directories are missing", async () => {
    mockInvoke.mockRejectedValue(new Error("NotFound"));
    const result = await loadAuthoredManifests(root);
    expect(result).toEqual([]);
  });

  it("resolves manifest (sidecar) + sender (.tsx header) into an InstalledAuthoredBlock", async () => {
    mockFs({
      active: {
        "sector-risk.tsx": {
          tsx: tsxWithHeader("sector-risk", sender),
          manifest: manifestJson("sector-risk"),
        },
      },
    });

    const result = await loadAuthoredManifests(root);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      sender,
      fullType: `${sender}:sector-risk`,
      folder: "active",
    });
    expect(result[0]?.manifest.slug).toBe("sector-risk");
  });

  it("merges active/ ∪ archived/ with folder tags (both render in existing docs)", async () => {
    mockFs({
      active: {
        "active-block.tsx": {
          tsx: tsxWithHeader("active-block", sender),
          manifest: manifestJson("active-block"),
        },
      },
      archived: {
        "archived-block.tsx": {
          tsx: tsxWithHeader("archived-block", sender),
          manifest: manifestJson("archived-block"),
        },
      },
    });

    const result = await loadAuthoredManifests(root);
    const byType = Object.fromEntries(result.map((i) => [i.manifest.slug, i.folder]));
    expect(byType).toEqual({ "active-block": "active", "archived-block": "archived" });
  });

  it("skips a .tsx whose sidecar is missing (robustness guard)", async () => {
    mockFs({
      active: {
        "ok.tsx": { tsx: tsxWithHeader("ok", sender), manifest: manifestJson("ok") },
        "no-sidecar.tsx": { tsx: tsxWithHeader("no-sidecar", sender) },
      },
    });

    const result = await loadAuthoredManifests(root);
    expect(result.map((i) => i.manifest.slug)).toEqual(["ok"]);
  });

  it("skips a .tsx whose header won't parse (no resolvable sender)", async () => {
    mockFs({
      active: {
        "headerless.tsx": {
          tsx: "export default {};", // no manifest header
          manifest: manifestJson("headerless"),
        },
      },
    });

    const result = await loadAuthoredManifests(root);
    expect(result).toEqual([]);
  });

  it("skips a sidecar with invalid JSON without throwing", async () => {
    mockFs({
      active: {
        "broken.tsx": {
          tsx: tsxWithHeader("broken", sender),
          manifest: "{ this is not valid json ",
        },
      },
    });

    const result = await loadAuthoredManifests(root);
    expect(result).toEqual([]);
  });

  it("skips a sidecar whose manifest lacks a string slug", async () => {
    mockFs({
      active: {
        "no-slug.tsx": {
          tsx: tsxWithHeader("no-slug", sender),
          manifest: JSON.stringify({ title: "x", attrs: [] }),
        },
      },
    });

    const result = await loadAuthoredManifests(root);
    expect(result).toEqual([]);
  });

  it("skips a sidecar whose attrs field is not an array", async () => {
    mockFs({
      active: {
        "bad-attrs.tsx": {
          tsx: tsxWithHeader("bad-attrs", sender),
          manifest: JSON.stringify({
            slug: "bad-attrs",
            title: "x",
            paletteLabel: "x",
            content: "none",
            attrs: "not-an-array",
            template: { kind: "text", value: "x" },
          }),
        },
      },
    });

    const result = await loadAuthoredManifests(root);
    expect(result).toEqual([]);
  });

  it("skips a sidecar whose content field is not 'rich-text' or 'none'", async () => {
    mockFs({
      active: {
        "bad-content.tsx": {
          tsx: tsxWithHeader("bad-content", sender),
          manifest: JSON.stringify({
            slug: "bad-content",
            title: "x",
            paletteLabel: "x",
            content: "invalid",
            attrs: [],
            template: { kind: "text", value: "x" },
          }),
        },
      },
    });

    const result = await loadAuthoredManifests(root);
    expect(result).toEqual([]);
  });

  it("skips a sidecar whose template lacks a kind string", async () => {
    mockFs({
      active: {
        "bad-template.tsx": {
          tsx: tsxWithHeader("bad-template", sender),
          manifest: JSON.stringify({
            slug: "bad-template",
            title: "x",
            paletteLabel: "x",
            content: "none",
            attrs: [],
            template: { value: "x" },
          }),
        },
      },
    });

    const result = await loadAuthoredManifests(root);
    expect(result).toEqual([]);
  });

  it("dedupes by slug, active winning over archived", async () => {
    mockFs({
      active: {
        "dup.tsx": {
          tsx: tsxWithHeader("dup", sender),
          manifest: manifestJson("dup", { title: "ACTIVE" }),
        },
      },
      archived: {
        "dup.tsx": {
          tsx: tsxWithHeader("dup", sender),
          manifest: manifestJson("dup", { title: "ARCHIVED" }),
        },
      },
    });

    const result = await loadAuthoredManifests(root);
    expect(result).toHaveLength(1);
    expect(result[0]?.manifest.title).toBe("ACTIVE");
    expect(result[0]?.folder).toBe("active");
  });

  it("skips dot-files, directories and .manifest.json entries in the scan", async () => {
    mockInvoke.mockImplementation((cmd, args) => {
      const path = args?.["path"] as string | undefined;
      if (cmd === "list_directory" && path === activeDir) {
        return Promise.resolve([
          fileEntry(".gitkeep", activeDir),
          dirEntry("brand-dir", activeDir),
          fileEntry("real.tsx.manifest.json", activeDir),
          fileEntry("real.tsx", activeDir),
        ]);
      }
      if (cmd === "list_directory" && path === archivedDir) {
        return Promise.reject(new Error("NotFound"));
      }
      if (cmd === "read_authored_block_file" && path === `${activeDir}/real.tsx`) {
        return Promise.resolve(tsxWithHeader("real", sender));
      }
      if (cmd === "read_authored_block_file" && path === `${activeDir}/real.tsx.manifest.json`) {
        return Promise.resolve(manifestJson("real"));
      }
      return Promise.reject(new Error(`unexpected invoke: ${cmd} ${path ?? ""}`));
    });

    const result = await loadAuthoredManifests(root);
    expect(result.map((i) => i.manifest.slug)).toEqual(["real"]);
  });
});

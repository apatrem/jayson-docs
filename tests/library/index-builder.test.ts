import { describe, expect, it } from "vitest";
import {
  buildLibraryIndex,
  docFolderPath,
  updateLibraryEntry,
  type DirectoryEntry,
  type LibraryFileSystem,
} from "../../src/library/index-builder";
import type { LibraryEntry, LibraryIndex } from "../../src/library/filter";
import type { Meta } from "../../src/schema/meta";

// ── In-memory mock filesystem ─────────────────────────────────────────────

interface MockFile {
  kind: "file";
  content: string;
  size: number;
  mtimeMs: number;
}
interface MockDirectory {
  kind: "directory";
  children: Record<string, MockNode>;
}
type MockNode = MockFile | MockDirectory;

function dir(children: Record<string, MockNode> = {}): MockDirectory {
  return { kind: "directory", children };
}
function file(content: string, mtimeMs = 1_000_000): MockFile {
  return { kind: "file", content, size: content.length, mtimeMs };
}

function makeFileSystem(root: MockDirectory): LibraryFileSystem {
  function navigate(absolutePath: string): MockNode | undefined {
    const parts = absolutePath.split("/").filter(Boolean);
    let node: MockNode = root;
    for (const part of parts) {
      if (node.kind !== "directory") return undefined;
      const next: MockNode | undefined = node.children[part];
      if (next === undefined) return undefined;
      node = next;
    }
    return node;
  }
  return {
    listDirectory(path) {
      const node = navigate(path);
      if (node === undefined || node.kind !== "directory") {
        return Promise.resolve([]);
      }
      const entries: DirectoryEntry[] = Object.entries(node.children).map(
        ([name, child]) => ({
          name,
          path: path === "/" ? `/${name}` : `${path}/${name}`,
          kind: child.kind,
        }),
      );
      return Promise.resolve(entries);
    },
    readText(path) {
      const node = navigate(path);
      if (node === undefined || node.kind !== "file") {
        return Promise.reject(new Error(`mock fs: not a file ${path}`));
      }
      return Promise.resolve(node.content);
    },
    stat(path) {
      const node = navigate(path);
      if (node === undefined || node.kind !== "file") {
        return Promise.reject(new Error(`mock fs: not a file ${path}`));
      }
      return Promise.resolve({ size: node.size, mtimeMs: node.mtimeMs });
    },
  };
}

function validMetaYaml(overrides: Partial<Meta> = {}): string {
  const meta: Meta = {
    client: "Acme",
    project: "Q1 Review",
    docKind: "proposal",
    tags: [],
    language: "en",
    status: "draft",
    archived: false,
    confidentialityLevel: "medium",
    owner: "me@example.com",
    reviewers: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    brandRef: "$brand:default",
    ...overrides,
  };
  const yamlLines = [
    "meta:",
    `  client: "${meta.client}"`,
    `  project: "${meta.project}"`,
    `  docKind: "${meta.docKind}"`,
    `  tags: [${meta.tags.map((t) => `"${t}"`).join(", ")}]`,
    `  language: "${meta.language}"`,
    `  status: "${meta.status}"`,
    `  archived: ${String(meta.archived)}`,
    `  confidentialityLevel: "${meta.confidentialityLevel}"`,
    `  owner: "${meta.owner}"`,
    `  reviewers: [${meta.reviewers.map((r) => `"${r}"`).join(", ")}]`,
    `  createdAt: "${meta.createdAt}"`,
    `  updatedAt: "${meta.updatedAt}"`,
    `  brandRef: "${meta.brandRef}"`,
  ];
  return yamlLines.join("\n") + "\n";
}

// ── buildLibraryIndex ─────────────────────────────────────────────────────

describe("buildLibraryIndex", () => {
  it("returns no entries for an empty root", async () => {
    const fs = makeFileSystem(dir());
    const index = await buildLibraryIndex("/", fs);
    expect(index.entries).toEqual([]);
  });

  it("finds a YAML in a single nested folder", async () => {
    const fs = makeFileSystem(
      dir({
        "acme-q1": dir({
          "document.yaml": file(validMetaYaml({ client: "Acme", project: "Q1 Review" })),
        }),
      }),
    );
    const index = await buildLibraryIndex("/", fs);
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0]?.meta.client).toBe("Acme");
    expect(index.entries[0]?.yamlFilename).toBe("document.yaml");
    expect(index.entries[0]?.path).toBe("/acme-q1");
  });

  it("finds YAMLs across multiple sibling folders", async () => {
    const fs = makeFileSystem(
      dir({
        "client-a": dir({ "doc.yaml": file(validMetaYaml({ client: "Alpha" })) }),
        "client-b": dir({ "doc.yaml": file(validMetaYaml({ client: "Beta" })) }),
        "client-c": dir({ "doc.yaml": file(validMetaYaml({ client: "Charlie" })) }),
      }),
    );
    const index = await buildLibraryIndex("/", fs);
    expect(
      index.entries.map((e) => e.meta.client).sort(),
    ).toEqual(["Alpha", "Beta", "Charlie"]);
  });

  it("skips YAMLs whose meta fails schema validation", async () => {
    const fs = makeFileSystem(
      dir({
        good: dir({ "doc.yaml": file(validMetaYaml({ client: "Good" })) }),
        bad: dir({ "doc.yaml": file("meta:\n  client: 1\n") }),
      }),
    );
    const index = await buildLibraryIndex("/", fs);
    expect(index.entries.map((e) => e.meta.client)).toEqual(["Good"]);
  });

  it("ignores folders with no YAML", async () => {
    const fs = makeFileSystem(
      dir({
        empty: dir({ "notes.txt": file("nothing") }),
        live: dir({ "doc.yaml": file(validMetaYaml({ client: "Live" })) }),
      }),
    );
    const index = await buildLibraryIndex("/", fs);
    expect(index.entries.map((e) => e.meta.client)).toEqual(["Live"]);
  });

  it("respects maxDepth (does not recurse past the limit)", async () => {
    const fs = makeFileSystem(
      dir({
        "level-1": dir({
          "level-2": dir({
            "level-3": dir({
              "deep.yaml": file(validMetaYaml({ client: "Deep" })),
            }),
          }),
        }),
      }),
    );
    // At depth=2 we reach /level-1/level-2 (depth decremented at each
    // recursion from /); deep.yaml lives one level deeper.
    const shallow = await buildLibraryIndex("/", fs, { maxDepth: 2 });
    expect(shallow.entries).toEqual([]);
    // At depth=5 the recursion has budget to reach /level-1/level-2/level-3
    // where deep.yaml is found.
    const deep = await buildLibraryIndex("/", fs, { maxDepth: 5 });
    expect(deep.entries.map((e) => e.meta.client)).toEqual(["Deep"]);
  });

  it("uses options.now() for lastScanAt when provided", async () => {
    const fs = makeFileSystem(dir());
    const index = await buildLibraryIndex("/", fs, { now: () => 42 });
    expect(index.lastScanAt).toBe(42);
  });

  it("captures fileSize and fileMtime from stat()", async () => {
    const yaml = validMetaYaml({ client: "Stats" });
    const fs = makeFileSystem(
      dir({
        only: dir({ "doc.yaml": file(yaml, 9_999_999) }),
      }),
    );
    const index = await buildLibraryIndex("/", fs);
    expect(index.entries[0]?.fileSize).toBe(yaml.length);
    expect(index.entries[0]?.fileMtime).toBe(9_999_999);
  });
});

// ── updateLibraryEntry ────────────────────────────────────────────────────

describe("updateLibraryEntry", () => {
  function entryAt(path: string, client: string): LibraryEntry {
    return {
      path,
      yamlFilename: "doc.yaml",
      meta: {
        client,
        project: "Project",
        docKind: "proposal",
        tags: [],
        language: "en",
        status: "draft",
        archived: false,
        confidentialityLevel: "medium",
        owner: "me@example.com",
        reviewers: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-05-01T00:00:00.000Z",
        brandRef: "$brand:default",
      },
      thumbnailUri: null,
      fileSize: 100,
      fileMtime: 1_000_000,
      hasAssetIssues: false,
      hasUnsavedComments: false,
    };
  }

  it("replaces the entry with matching path", () => {
    const index: LibraryIndex = {
      entries: [entryAt("/a", "Alpha"), entryAt("/b", "Beta")],
      lastScanAt: 0,
    };
    const updated: LibraryEntry = {
      ...entryAt("/a", "Alpha"),
      hasUnsavedComments: true,
    };
    const next = updateLibraryEntry(index, updated);
    expect(next.entries.find((e) => e.path === "/a")?.hasUnsavedComments).toBe(true);
    expect(next.entries.find((e) => e.path === "/b")?.hasUnsavedComments).toBe(false);
  });

  it("is a no-op when no entry matches the path", () => {
    const index: LibraryIndex = {
      entries: [entryAt("/a", "Alpha")],
      lastScanAt: 5,
    };
    const ghost = entryAt("/ghost", "Ghost");
    const next = updateLibraryEntry(index, ghost);
    expect(next.entries.map((e) => e.path)).toEqual(["/a"]);
    expect(next.lastScanAt).toBe(5);
  });

  it("preserves lastScanAt unchanged", () => {
    const index: LibraryIndex = {
      entries: [entryAt("/a", "Alpha")],
      lastScanAt: 12345,
    };
    expect(
      updateLibraryEntry(index, { ...entryAt("/a", "Alpha"), hasAssetIssues: true })
        .lastScanAt,
    ).toBe(12345);
  });
});

// ── docFolderPath ─────────────────────────────────────────────────────────

describe("docFolderPath", () => {
  it("slugifies client and project under the root", () => {
    expect(docFolderPath("/library", "Acme Corp", "Q1 Strategy Review")).toBe(
      "/library/acme-corp/q1-strategy-review",
    );
  });

  it("collapses non-alphanumeric runs into single hyphens", () => {
    expect(docFolderPath("/r", "A & B / C", "X--Y__Z")).toBe("/r/a-b-c/x-y-z");
  });

  it("trims leading and trailing hyphens", () => {
    expect(docFolderPath("/r", "  Spaces  ", "!ProjectName!")).toBe(
      "/r/spaces/projectname",
    );
  });

  it("lowercases mixed-case input", () => {
    expect(docFolderPath("/r", "BigCorp", "PROJECT")).toBe("/r/bigcorp/project");
  });
});

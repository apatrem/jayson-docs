import { invoke } from "@tauri-apps/api/core";
import { afterEach, describe, expect, it, vi } from "vitest";

interface DirectoryEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

async function listDirectory(path: string): Promise<DirectoryEntry[]> {
  return invoke<DirectoryEntry[]>("list_directory", { path });
}

async function fileExists(path: string): Promise<boolean> {
  return invoke<boolean>("file_exists", { path });
}

async function ensureDirectory(path: string): Promise<void> {
  await invoke("ensure_directory", { path });
}

async function moveFile(src: string, dst: string): Promise<void> {
  await invoke("move_file", { src, dst });
}

describe("fs remaining IPC smoke contract (T-125)", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    vi.restoreAllMocks();
  });

  it("list_directory invokes with path and returns DirectoryEntry array", async () => {
    const entries: DirectoryEntry[] = [
      { name: "proposal.yaml", path: "/root/proposal.yaml", is_dir: false },
      { name: "assets", path: "/root/assets", is_dir: true },
    ];
    const invokeMock = vi.fn(() => Promise.resolve(entries));
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    const result = await listDirectory("/root");
    expect(result).toEqual(entries);
    expect(invokeMock).toHaveBeenCalledWith(
      "list_directory",
      { path: "/root" },
      undefined,
    );
  });

  it("file_exists invokes with path and returns boolean", async () => {
    const invokeMock = vi.fn(() => Promise.resolve(true));
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    const exists = await fileExists("/root/my-folder");
    expect(exists).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith(
      "file_exists",
      { path: "/root/my-folder" },
      undefined,
    );
  });

  it("file_exists returns false for a missing path (backend returns false, not an error)", async () => {
    const invokeMock = vi.fn(() => Promise.resolve(false));
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    const exists = await fileExists("/root/nonexistent");
    expect(exists).toBe(false);
  });

  it("ensure_directory invokes with path and resolves void", async () => {
    const invokeMock = vi.fn(() => Promise.resolve(null));
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    await expect(ensureDirectory("/root/Sample Proposal")).resolves.toBeUndefined();
    expect(invokeMock).toHaveBeenCalledWith(
      "ensure_directory",
      { path: "/root/Sample Proposal" },
      undefined,
    );
  });

  it("move_file invokes with src and dst", async () => {
    const invokeMock = vi.fn(() => Promise.resolve(null));
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    await expect(
      moveFile("/root/old-name.yaml", "/root/new-name.yaml"),
    ).resolves.toBeUndefined();
    expect(invokeMock).toHaveBeenCalledWith(
      "move_file",
      { src: "/root/old-name.yaml", dst: "/root/new-name.yaml" },
      undefined,
    );
  });

  it("surfaces permission-denied errors from the backend", async () => {
    const error = Object.assign(new Error("path is outside configured asset scope"), {
      kind: "permission-denied",
    });
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: vi.fn(() => Promise.reject(error)) },
    });

    await expect(listDirectory("/etc")).rejects.toMatchObject({ kind: "permission-denied" });
    await expect(fileExists("/etc/passwd")).rejects.toMatchObject({ kind: "permission-denied" });
    await expect(ensureDirectory("/etc/evil")).rejects.toMatchObject({ kind: "permission-denied" });
    await expect(moveFile("/etc/a", "/etc/b")).rejects.toMatchObject({ kind: "permission-denied" });
  });
});

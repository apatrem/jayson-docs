import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const DEFERRED_M7_FS_COMMANDS = [
  "list_directory",
  "file_exists",
  "ensure_directory",
  "move_file",
] as const;

describe("fs binary IPC source hardening", () => {
  const fsRs = readFileSync("src-tauri/src/ipc/fs.rs", "utf8");

  it("keeps a post-canonicalize extension rejection in the binary read path", () => {
    expect(fsRs).toContain("canonical path extension is not allowed");
    expect(fsRs).toContain("rejects_binary_symlink_to_disallowed_canonical_extension");
  });

  it("does not keep deferred M7 filesystem command bodies in fs.rs", () => {
    for (const command of DEFERRED_M7_FS_COMMANDS) {
      expect(fsRs).not.toContain(`pub async fn ${command}`);
    }
  });

  it("does not keep the legacy validate_path helper", () => {
    expect(fsRs).not.toContain("fn validate_path(");
  });

  it("uses a single Windows replacement call instead of a backup rename swap", () => {
    expect(fsRs).toContain("MoveFileExW");
    expect(fsRs).toContain("MOVEFILE_REPLACE_EXISTING");
    expect(fsRs).toContain("MOVEFILE_WRITE_THROUGH");
    expect(fsRs).not.toContain("fs::rename(target_path");
    expect(fsRs).not.toContain("backup failed");
    expect(fsRs).not.toContain("original restored");
  });
});

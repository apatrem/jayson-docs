import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// T-125 promoted these from M7-deferred to registered on the invoke surface.
const M8_FS_COMMANDS = [
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

  it("confirms M8 filesystem commands are implemented in fs.rs (T-125)", () => {
    for (const command of M8_FS_COMMANDS) {
      expect(fsRs).toContain(`pub async fn ${command}`);
    }
  });

  it("uses validate_absolute_path (not the legacy untyped validate_path) for directory commands", () => {
    expect(fsRs).toContain("fn validate_absolute_path(");
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

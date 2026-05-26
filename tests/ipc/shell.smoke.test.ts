import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type CapabilityPermission =
  | string
  | {
      identifier: string;
      allow?: Array<Record<string, string>>;
    };

interface CapabilityFile {
  permissions: CapabilityPermission[];
}

describe("shell capability scope", () => {
  it("allows browser handoff only through the export temp directory", () => {
    const capability = JSON.parse(
      readFileSync("src-tauri/capabilities/main-window.json", "utf8"),
    ) as CapabilityFile;

    expect(capability.permissions).toContain("shell:default");
    expect(capability.permissions).not.toContain("shell:allow-open");
    expect(capability.permissions).toContainEqual({
      identifier: "shell:allow-open",
      allow: [{ path: "$TEMP/docsystem-export/**" }],
    });
  });
});

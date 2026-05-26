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
  it("grants shell open while plugin regex owns path scoping", () => {
    const capability = JSON.parse(
      readFileSync("src-tauri/capabilities/main-window.json", "utf8"),
    ) as CapabilityFile;

    expect(capability.permissions).toContain("shell:default");
    expect(capability.permissions).toContain("shell:allow-open");
    expect(capability.permissions).not.toContainEqual(
      expect.objectContaining({ identifier: "shell:allow-open" }),
    );
  });
});

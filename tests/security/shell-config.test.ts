import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface TauriConfig {
  plugins?: {
    shell?: {
      open?: unknown;
    };
  };
}

const tauriConfig = JSON.parse(
  readFileSync("src-tauri/tauri.conf.json", "utf8"),
) as TauriConfig;

function configuredOpenRegex(): RegExp {
  const pattern = tauriConfig.plugins?.shell?.open;
  expect(typeof pattern).toBe("string");
  expect(pattern).not.toBe("");
  return new RegExp(pattern as string);
}

describe("Tauri shell plugin open scope", () => {
  it("configures a non-empty regex string", () => {
    const pattern = tauriConfig.plugins?.shell?.open;

    expect(typeof pattern).toBe("string");
    expect(pattern).not.toBe("");
    expect(pattern).not.toBe(true);
    expect(pattern).not.toBe(false);
  });

  it("allows browser handoff temp HTML paths and web URLs", () => {
    const regex = configuredOpenRegex();

    expect(
      regex.test(
        "/var/folders/8b/abc/T/docsystem-export/123e4567-e89b-12d3-a456-426614174000/Proposal.html",
      ),
    ).toBe(true);
    expect(
      regex.test(
        "/tmp/docsystem-export/123e4567-e89b-12d3-a456-426614174000/Proposal.html",
      ),
    ).toBe(true);
    expect(
      regex.test(
        String.raw`C:\Users\me\AppData\Local\Temp\docsystem-export\123e4567-e89b-12d3-a456-426614174000\Proposal.html`,
      ),
    ).toBe(true);
    expect(regex.test("https://example.com/foo")).toBe(true);
  });

  it("rejects local paths and active-content URL schemes", () => {
    const regex = configuredOpenRegex();

    expect(regex.test("/etc/passwd")).toBe(false);
    expect(regex.test("file:///etc/shadow")).toBe(false);
    expect(regex.test("smb://attacker/share")).toBe(false);
    expect(regex.test("javascript:alert(1)")).toBe(false);
    expect(regex.test("data:text/html,<script>alert(1)</script>")).toBe(false);
  });
});

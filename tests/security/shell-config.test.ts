import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface TauriConfig {
  plugins?: {
    shell?: {
      open?: unknown;
    };
  };
}

const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as TauriConfig;

// Tauri wraps plugins.shell.open with ^...$ at runtime; keep this mirror in sync
// with tauri-plugin-shell-*/src/lib.rs:155.
function configuredOpenRegex(): RegExp {
  const pattern = tauriConfig.plugins?.shell?.open;
  expect(typeof pattern).toBe("string");
  expect(pattern).not.toBe("");
  return new RegExp(`^${pattern as string}$`, "u");
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
      regex.test("/tmp/docsystem-export/123e4567-e89b-12d3-a456-426614174000/Proposal.html"),
    ).toBe(true);
    expect(
      regex.test(
        String.raw`C:\Users\me\AppData\Local\Temp\docsystem-export\123e4567-e89b-12d3-a456-426614174000\Proposal.html`,
      ),
    ).toBe(true);
    expect(regex.test("https://example.com/foo")).toBe(true);
    expect(regex.test("https://example.com/path/with/segments?q=v#frag")).toBe(true);
    expect(regex.test("http://localhost:1420/dev")).toBe(true);
  });

  it("rejects local paths and active-content URL schemes", () => {
    const regex = configuredOpenRegex();

    expect(regex.test("/etc/passwd")).toBe(false);
    expect(regex.test("file:///etc/shadow")).toBe(false);
    expect(regex.test("file:///tmp/docsystem-export/abc-def-1234/x.html")).toBe(false);
    expect(regex.test("smb://attacker/share")).toBe(false);
    expect(regex.test("smb://attacker/share/docsystem-export/aaaa/y.html")).toBe(false);
    expect(regex.test(String.raw`\\attacker\share\docsystem-export\aaaa\evil.html`)).toBe(false);
    expect(regex.test("/tmp/docsystem-export/-/x.html")).toBe(false);
    expect(
      regex.test("/tmp/docsystem-export/12345678-1234-1234-1234-1234abcdef12/../etc/passwd.html"),
    ).toBe(false);
    expect(regex.test("file:///etc/passwd/docsystem-export/abc-def/passwd.html")).toBe(false);
    expect(regex.test("javascript:alert(1)")).toBe(false);
    expect(regex.test("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  // T-123q round-3 audit follow-ups (M-3 + L-3 coverage). Each case asserts
  // a specific attack vector the round-2 regex permitted. If the configured
  // `plugins.shell.open` pattern is loosened back to `https?://[^\s<>"]+`
  // (or the host-separating refactor is regressed), the corresponding case
  // fails immediately.
  it("rejects credential-bearing URLs and host-confusion injection (T-123q)", () => {
    const regex = configuredOpenRegex();

    // M-3: credentials in host (`user:pass@evil.com` smuggles target host).
    expect(regex.test("https://user:pass@evil.com/")).toBe(false);
    expect(regex.test("https://user@evil.com/")).toBe(false);
    expect(regex.test("http://admin:hunter2@10.0.0.1/")).toBe(false);
    // Windows-path-via-URL injection (`example.com\..\..\Windows`).
    expect(regex.test(String.raw`https://example.com\with\backslash`)).toBe(false);
    // Embedded NUL (smuggles past path validators that string-trim).
    expect(regex.test("https://example.com/foo\0")).toBe(false);
    // Trailing newline (header-splitting / log-poisoning class vector).
    expect(regex.test("https://example.com/foo\n")).toBe(false);
    // Incomplete URL — empty host fails the `+` quantifier.
    expect(regex.test("https://")).toBe(false);
    // Unencoded space in path — `\s` exclusion catches this.
    expect(regex.test("https://example.com/path with space")).toBe(false);
  });

  it("rejects lowercase-drive and forward-slash Windows export paths (T-123q)", () => {
    const regex = configuredOpenRegex();

    // The path branch requires uppercase `[A-Z]:\\`. Lowercase drive letter
    // (a Windows-fs surface that some shell wrappers normalize) must reject.
    expect(
      regex.test(
        String.raw`c:\Temp\docsystem-export\12345678-1234-1234-1234-1234567890ab\x.html`,
      ),
    ).toBe(false);
    // Forward slashes after `C:` are a non-standard Windows path form that
    // the regex deliberately rejects — Windows shells accept it natively,
    // so allowing it would let the path branch double as a URL injection.
    expect(
      regex.test("C:/Temp/docsystem-export/12345678-1234-1234-1234-1234567890ab/x.html"),
    ).toBe(false);
  });

  it("preserves URL-encoded space as a positive regression case (T-123q)", () => {
    const regex = configuredOpenRegex();

    // T-123q positive case: legitimate URLs may carry `%20` in the path.
    // If the path-class is tightened so far that it rejects `%`, this fails.
    expect(
      regex.test("https://example.com/path%20with%20encoded%20space"),
    ).toBe(true);
  });
});

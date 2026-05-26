import { describe, expect, it } from "vitest";
import { formatErrorMessage, isIpcError } from "../../src/ipc/errors";

describe("isIpcError", () => {
  it("recognizes a Tauri-shaped IPC rejection object", () => {
    expect(
      isIpcError({ kind: "permission-denied", message: "path outside scope" }),
    ).toBe(true);
    expect(isIpcError({ kind: "not-found", message: "x" })).toBe(true);
    expect(isIpcError({ kind: "io", message: "" })).toBe(true);
  });

  it("rejects Error instances (they have a message but no kind)", () => {
    expect(isIpcError(new Error("boom"))).toBe(false);
    expect(isIpcError(new TypeError("nope"))).toBe(false);
  });

  it("rejects primitives, null, undefined, arrays", () => {
    expect(isIpcError("permission-denied")).toBe(false);
    expect(isIpcError(123)).toBe(false);
    expect(isIpcError(null)).toBe(false);
    expect(isIpcError(undefined)).toBe(false);
    expect(isIpcError([])).toBe(false);
  });

  it("rejects partial shapes (missing or non-string fields)", () => {
    expect(isIpcError({ kind: "io" })).toBe(false);
    expect(isIpcError({ message: "x" })).toBe(false);
    expect(isIpcError({ kind: 123, message: "x" })).toBe(false);
    expect(isIpcError({ kind: "io", message: 42 })).toBe(false);
  });
});

describe("formatErrorMessage", () => {
  it("unwraps an Error instance's message", () => {
    expect(formatErrorMessage(new Error("disk full"))).toBe("disk full");
  });

  it("formats an IpcError as `kind: message` (the M7-validation hotfix bug)", () => {
    // This is the EXACT shape that Tauri's invoke() rejects with — a plain
    // JSON object, NOT an Error instance. Before the hotfix, App.tsx error
    // handlers ran `String(error)` on this, producing "[object Object]" in
    // the toast and hiding the real Rust error.
    const tauriRejection = {
      kind: "permission-denied",
      message: "export path escaped the temp export root",
    };
    expect(formatErrorMessage(tauriRejection)).toBe(
      "permission-denied: export path escaped the temp export root",
    );
  });

  it("falls back to String() for unknown shapes", () => {
    expect(formatErrorMessage("just a string")).toBe("just a string");
    expect(formatErrorMessage(42)).toBe("42");
    expect(formatErrorMessage(null)).toBe("null");
    expect(formatErrorMessage(undefined)).toBe("undefined");
  });

  it("does NOT produce '[object Object]' for any IpcError-shaped input", () => {
    // Regression guard for the exact symptom the user reported during M7
    // manual validation: "export PDF gives [object Object]".
    for (const kind of [
      "not-found",
      "permission-denied",
      "invalid",
      "io",
      "internal",
    ] as const) {
      const formatted = formatErrorMessage({ kind, message: "x" });
      expect(formatted).not.toBe("[object Object]");
      expect(formatted).toContain(kind);
      expect(formatted).toContain("x");
    }
  });
});

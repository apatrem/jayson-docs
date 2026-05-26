/**
 * IpcError — the JS-side mirror of `src-tauri/src/ipc/types.rs::IpcError`.
 *
 * Tauri's `invoke()` REJECTS WITH THE RAW JSON OBJECT, NOT an Error instance.
 * So `catch (e) { e instanceof Error }` is ALWAYS FALSE for IPC failures.
 *
 * The Rust enum is serialized with `#[serde(tag = "kind", content = "message",
 * rename_all = "kebab-case")]`, producing this shape:
 *
 *   { kind: "not-found", message: "..." }
 *   { kind: "permission-denied", message: "..." }
 *   { kind: "invalid", message: "..." }
 *   { kind: "io", message: "..." }
 *   { kind: "internal", message: "..." }
 *
 * History: M7 manual validation found that 4 sites in `src/App.tsx` used
 * `error instanceof Error ? error.message : String(error)` — which falls
 * through to `String({kind, message})` = `"[object Object]"` on IPC failure,
 * hiding the actual Rust error message. This file is the canonical place
 * for IPC error handling so future invoke() call-sites can't repeat the bug.
 * See `AGENTS.md §Review playbook` convention #8.
 */

export type IpcErrorKind =
  | "not-found"
  | "permission-denied"
  | "invalid"
  | "io"
  | "internal";

export interface IpcError {
  kind: IpcErrorKind;
  message: string;
}

/**
 * Type guard for Tauri IPC error objects (the raw JSON shape that `invoke()`
 * rejects with). Returns true for plain objects matching `{ kind, message }`
 * with both string-typed; does NOT match `Error` instances or `null`.
 */
export function isIpcError(value: unknown): value is IpcError {
  if (typeof value !== "object" || value === null) return false;
  const v = value as { kind?: unknown; message?: unknown };
  return typeof v.kind === "string" && typeof v.message === "string";
}

/**
 * Render any caught value as a single human-readable string, handling the
 * three common shapes JS catch blocks see in this codebase:
 *
 *   1. `Error` instance → `error.message`
 *   2. `IpcError` JSON object (from Tauri invoke rejection) → `error.message`
 *      (with kind prefix when useful for diagnosis)
 *   3. anything else → `String(value)`
 *
 * Used by `src/App.tsx` action error handlers and anywhere else that catches
 * a value that MIGHT be a Tauri IPC rejection. Replace any `error instanceof
 * Error ? error.message : String(error)` with `formatErrorMessage(error)`.
 */
export function formatErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (isIpcError(value)) return `${value.kind}: ${value.message}`;
  return String(value);
}

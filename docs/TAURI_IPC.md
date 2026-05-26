# Tauri IPC Surface — Command Specification

**Purpose:** define every Tauri command the app needs, with signatures on both sides (Rust `#[tauri::command]` + TypeScript `invoke<T>(...)`). The JS↔Rust boundary is where the security model lives — if a command is missing or sloppy, the model leaks.

**Audience:** the developer implementing M0 (T-02) and M3/M4 (LLM + file I/O).

**Companion to:** `starter/src-tauri/src/lib.rs`, `starter/src-tauri/src/ipc/`, `starter/src-tauri/tauri.conf.json`, `DECISIONS.md` (D-22, D-23, D-32, D-34).

---

## Design principles

1. **Every privileged operation is a command.** Filesystem reads, keychain access, PDF export, SQLite writes — all go through `invoke(...)`. The frontend never imports `node:fs`, `node:path`, or anything that bypasses the boundary.
2. **Commands accept and return JSON-serializable types only.** No raw `Vec<u8>` for file contents — base64-encode bytes if you need them; for text files, strings.
3. **Errors are typed.** Each command returns `Result<T, IpcError>` where `IpcError` is a tagged-union enum (NotFound, PermissionDenied, Invalid, etc.). The frontend gets a discriminated TypeScript error and can dispatch UI per case.
4. **Side effects are explicit.** Commands that mutate state name the resource (`write_yaml_file`, `set_secret`, `insert_cost_row`). Commands that read are pure verbs (`read_yaml_file`, `get_summary`).
5. **The CSP and `assetProtocol.scope` in `tauri.conf.json` are part of the contract.** A command accepting a path must validate that the path is within an allowed scope; rejecting paths outside scope at the Rust layer.

## Shared types

### Rust (`src-tauri/src/ipc/types.rs`)

```rust
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Serialize, Deserialize, Error)]
#[serde(tag = "kind", content = "message", rename_all = "kebab-case")]
pub enum IpcError {
    #[error("not found: {0}")]
    NotFound(String),
    #[error("permission denied: {0}")]
    PermissionDenied(String),
    #[error("invalid input: {0}")]
    Invalid(String),
    #[error("io error: {0}")]
    Io(String),
    #[error("internal: {0}")]
    Internal(String),
}

pub type IpcResult<T> = Result<T, IpcError>;
```

### TypeScript (`src/ipc/types.ts`)

```typescript
export type IpcError =
  | { kind: "not-found"; message: string }
  | { kind: "permission-denied"; message: string }
  | { kind: "invalid"; message: string }
  | { kind: "io"; message: string }
  | { kind: "internal"; message: string };

export function isIpcError(e: unknown): e is IpcError {
  return typeof e === "object" && e !== null && "kind" in e && "message" in e;
}
```

---

## §1 — File I/O

These commands wrap the Tauri FS plugin with path-scope validation. The frontend never receives raw filesystem handles.

**M7-spike command surface:** only `read_yaml_file` and `write_yaml_file` are registered. `list_directory`, `file_exists`, `ensure_directory`, and `move_file` are documented below for M8, but are intentionally deferred in M7 and return "command not registered" from the renderer. M8 T-125 re-registers them with the same canonicalize + scope-check hardening used by the YAML commands.

### `read_yaml_file(path: string) -> string`

**Rust:**
```rust
#[tauri::command]
pub async fn read_yaml_file(path: String) -> IpcResult<String> {
    let validated = validate_path_in_scope(&path)?;
    std::fs::read_to_string(&validated).map_err(|e| IpcError::Io(e.to_string()))
}
```

**TypeScript:**
```typescript
import { invoke } from "@tauri-apps/api/core";

export async function readYamlFile(path: string): Promise<string> {
  return invoke<string>("read_yaml_file", { path });
}
```

**Behavior:**
- Reads UTF-8 text. Rejects non-UTF-8 (Invalid).
- Path must be within an `assetProtocol.scope` glob (rejects otherwise: PermissionDenied).
- Does NOT parse YAML — the frontend's `yaml` package does that. Rust just shuttles bytes.

### `write_yaml_file(path: string, content: string) -> void`

Writes UTF-8 text atomically (write-to-temp + rename). Rejects paths outside scope.

### `list_directory(path: string) -> DirEntry[]`

**Registration:** deferred in M7-spike; re-registered in M8 T-125 with full T-117 hardening.

```typescript
interface DirEntry {
  name: string;
  path: string;          // absolute
  kind: "file" | "directory";
  isYaml: boolean;       // helper: name endsWith .yaml
  isDocFolder: boolean;  // helper: directory containing a *.yaml file
}
```

Used by the library UI to scan the cloud-sync root. Returns one level deep — caller recurses if needed.

### `file_exists(path: string) -> boolean`

**Registration:** deferred in M7-spike; re-registered in M8 T-125 with full T-117 hardening.

Quick existence check. Returns false for both "doesn't exist" and "exists but not readable" — they're equivalent for the UI.

### `ensure_directory(path: string) -> void`

**Registration:** deferred in M7-spike; re-registered in M8 T-125 with full T-117 hardening.

`mkdir -p` semantics. Used by Save As (D-19) to create the doc folder.

### `move_file(from: string, to: string) -> void`

**Registration:** deferred in M7-spike; re-registered in M8 T-125 with full T-117 hardening.

Used by the setup pipeline to move files from `/generated-blocks/pending/` to `/generated-blocks/active/` after human review.

### Path scope validation (shared private helper)

```rust
fn validate_path_in_scope(path: &str) -> IpcResult<PathBuf> {
    let canonical = std::fs::canonicalize(path)
        .map_err(|e| IpcError::Invalid(format!("path canonicalize failed: {}", e)))?;
    // Read scope globs from app state (initialized from tauri.conf.json at startup).
    // Reject if the canonical path doesn't match any allowed glob.
    // Reject if the path contains `..` traversal segments (defense in depth — canonicalize should resolve, but check anyway).
    if !is_within_allowed_scope(&canonical) {
        return Err(IpcError::PermissionDenied(format!("path outside allowed scope: {}", canonical.display())));
    }
    Ok(canonical)
}
```

---

## §2 — OS Keychain (LLM API keys per D-22, D-23)

API keys are stored in the OS keychain by the install script (T-73) and read on demand. They never live in the config file.

### `get_secret(name: string) -> string`

**Rust:**
```rust
#[tauri::command]
pub async fn get_secret(name: String) -> IpcResult<String> {
    let entry = keyring::Entry::new("docsystem", &name)
        .map_err(|e| IpcError::Internal(e.to_string()))?;
    entry.get_password().map_err(|e| match e {
        keyring::Error::NoEntry => IpcError::NotFound(name),
        _ => IpcError::Internal(e.to_string()),
    })
}
```

**TypeScript:**
```typescript
export async function getSecret(name: string): Promise<string> {
  return invoke<string>("get_secret", { name });
}
```

**Naming convention:** secret names are namespaced: `llm.fast.api-key`, `llm.thinking.api-key`. The install script chooses the names; the LLM client reads them by name from `AppConfig.llm.*.keychainEntry`.

### `set_secret(name: string, value: string) -> void`

Used only by the install/setup flow. The main app should never set secrets at runtime.

### `delete_secret(name: string) -> void`

Used by an uninstall flow or a "rotate keys" admin action.

---

## §3 — App configuration

The local config file (`AppConfig` per `TYPES.md §10`) lives at the OS app-config dir. Reads and writes go through Rust to ensure path scoping.

### `read_app_config() -> AppConfig`

Returns the parsed config. Throws NotFound if no config exists (first launch case — caller routes to install flow).

### `write_app_config(config: AppConfig) -> void`

Writes atomically. Used by setup install + by Settings UI updates.

### `get_config_dir() -> string`

Returns the absolute path of the app-config dir (e.g. `~/Library/Application Support/com.consultancy.docsystem` on macOS). Useful for the cost ledger location.

---

## §4 — Cost ledger (D-34)

The ledger lives in SQLite at `<config_dir>/cost.db`. Operations go through Rust so the schema is enforced (no behavioral columns can be added without changing Rust code).

### `insert_cost_row(row: CostLedgerRow) -> void`

**Rust:**
```rust
#[derive(Deserialize)]
pub struct CostLedgerRowInput {
    pub timestamp: String,           // ISO-8601
    pub model: String,
    pub provider: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub cached_tokens: i64,
    pub computed_cost_usd: f64,
    pub doc_id: Option<String>,
    pub call_kind: String,           // "generation" | "comment-batch" | ...
}

#[tauri::command]
pub async fn insert_cost_row(row: CostLedgerRowInput) -> IpcResult<()> {
    // Open SQLite, INSERT into cost_rows table.
    // The table schema has ONLY these columns — there is no `prompt_content`
    // or `response_content` column. This is the structural enforcement of
    // D-32/D-34: the carve-out cannot drift into analytics without a Rust
    // code change visible in code review.
    // ...
}
```

### `get_cost_summary() -> CostSummary`

Returns `CostSummary` per `TYPES.md §9` — current-month total, 30-day rolling, per-doc breakdown.

### `clear_cost_history() -> void`

Wipes the SQLite db. Used by the user-facing "Clear all cost history" button.

### `prune_old_rows(retention_days: number) -> number`

Deletes rows older than `retention_days`. Returns the number deleted. Called on app launch + nightly with `retention_days = 395` (13 months) per D-34.

---

## §5 — PDF export

### `export_pdf(input: PdfExportInput) -> ExportHandoff`

The command name is kept as `export_pdf` for historical reasons and to preserve
the registered IPC command count. In M7-spike it does **not** produce a finished
PDF. It writes print-ready HTML to a scoped temp file and returns a browser
handoff path; the user finishes the export in their browser with
Cmd-P / Ctrl-P → Save as PDF. A v1.1 task may rename this to
`prepare_print_handoff` for honesty.

```typescript
interface PdfExportInput {
  html: string;
  suggestedName: string;
}

interface ExportHandoff {
  kind: "browser_handoff";
  path: string;
}
```

**Behavior:** writes `html` to
`<tmpdir>/docsystem-export/<uuid>/<sanitized-base-name>.html`, returns
`{ kind: "browser_handoff", path }`, and expects the frontend to open `path`
with `@tauri-apps/plugin-shell`. `suggestedName` sanitization strips a trailing
`.pdf` first, replaces non-`[A-Za-z0-9._ -]` characters with `_`, strips
leading dots, clamps to 200 characters, appends `.html`, then canonicalizes the
result to ensure it remains under the temp export root.

**Cleanup:** on app startup, the Tauri setup hook sweeps
`<tmpdir>/docsystem-export/` before any new export runs. Cleanup failures are
logged and do not block app launch.

**Why this is a Rust command and not pure JS:** the Rust side owns the privileged
filesystem write and temp-root validation. The renderer remains responsible for
creating safe, self-contained HTML.

---

## §6 — Commands that are NOT Tauri commands

Things to keep in JS (don't add Tauri commands for them):

- **LLM API calls.** The frontend calls Anthropic/OpenAI directly via `fetch` (the CSP allows `connect-src` to those origins). Pulling the API key through `get_secret` then calling `fetch` from JS is fine — the key never lives in JS state longer than one request.
- **YAML parsing.** Use the `yaml` npm package in the frontend.
- **ProseMirror manipulation.** Pure JS.
- **ECharts rendering.** Pure JS for the editor; pre-rendered to SVG by JS in a Node subprocess (or browser worker) for PDF export.

---

## §7 — Why commands are split this way (rationale)

1. **Privileged ops in Rust, pure compute in JS.** Filesystem and keychain need the Rust layer because Tauri's security model gates them. YAML parsing is pure compute — no reason to cross the boundary.
2. **No `dangerouslySetInnerHTML`-equivalent escape hatch.** No `execute_arbitrary_javascript` command. No `read_any_file` command. The frontend cannot reach outside the scope defined in `tauri.conf.json`.
3. **Each command has one clear purpose.** Avoid `do_lots_of_stuff` commands — they accumulate special cases and become impossible to audit.
4. **All paths validated at the Rust layer.** Even though `AssetPathSchema` rejects bad paths in the schema, the Rust commands re-validate against `assetProtocol.scope`. Defense in depth.

---

## §8 — Implementation checklist

When implementing T-02 (Tauri shell setup) and T-60 (LLM client), tick these off:

- [ ] All commands from §1–§5 implemented in `src-tauri/src/ipc/{fs,keychain,config,cost,pdf}.rs`.
- [ ] `IpcError` enum in `src-tauri/src/ipc/types.rs`.
- [ ] TypeScript wrappers in `src/ipc/{fs,keychain,config,cost,pdf}.ts` — one file per Rust module.
- [ ] `tauri.conf.json` `assetProtocol.scope` covers all paths the FS commands will touch.
- [ ] `tauri.conf.json` CSP `connect-src` covers `https://api.anthropic.com` + `https://api.openai.com` (or your chosen providers).
- [ ] Integration tests: each Rust command has a test that exercises happy + error paths.
- [ ] Frontend integration tests: each TS wrapper mocks `invoke` and asserts the JSON envelope.
- [ ] An automated audit test that walks `src/` looking for direct imports of `node:fs`, `node:path`, etc. and fails the build (those must go through commands).

---

## §9 — Future / v1.1+ commands (not yet)

- `start_yjs_session(doc_id)` / `apply_yjs_update(...)` — when collaboration arrives in v2.
- `setup_run_scan(input_dir, output_dir)` — if we ever want the setup pipeline runnable from inside the app (currently a CLI per `SETUP_PIPELINE.md §2`).
- `export_docsys_bundle(doc_folder, output_zip)` — if "Export as .docsys" (D-19) moves from JS-side (using JSZip in the renderer) to Rust-side.

When adding any of these, keep the principles in §1 in mind.

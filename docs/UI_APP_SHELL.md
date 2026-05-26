# App Shell UI — Design Spec (M7-spike scope)

**Purpose:** concrete design for the M7-spike app shell — the deliberately-narrow first integration milestone that proves a real consultant can open a YAML document, edit it, insert blocks via the palette, save it, and export it to PDF via the user's default browser. M7-spike does NOT include a library, install wizard, AI, comments, deck rendering, or settings — those surfaces stay as already-built-but-disconnected modules until M8+ where their scope can be informed by what consultant testing of the spike reveals.

**Audience:** the developer implementing M7-spike (T-115 → T-123, ~33h total). M8's incremental updates to this spec are tracked by T-124 (see §M8 forward-references below).

**Companion to:** `docs/BUILD_BRIEF.md` §3 (M7 entry), `docs/TASKS.md` Phase 7 (T-115..T-123), `docs/TAURI_IPC.md` (IPC contract), `docs/DECISIONS.md` (D-39 perf budget, D-36 watchdog HOC), `docs/UI_LIBRARY.md` + `docs/UI_REVIEW_PANEL.md` + `docs/SETUP_INSTALL_FLOW.md` (cross-referenced ONLY for what M7-spike defers — none of those surfaces ship in M7-spike).

---

## Why this milestone matters

Before M7-spike, every subsystem (schema, renderer, editor, comments, deck, library, cost-ledger, LLM, setup) had passing unit tests, but `src/App.tsx` returned `null` and the 17 Tauri IPC commands were registered but mostly no-op stubs. The privacy-notice promise of "13-month auto-prune" was encoded in tested modules but never called at runtime because there was no shell to call them.

M7-spike fixes that gap with the minimum useful integration — enough that a consultant can actually touch the editor surface and surface UX problems early. **Anything that isn't on the critical path from "open a file" to "export a PDF" is deferred to M8+.**

The deliberate narrowness is the design. The prior plan iteration had M7 cover library + install wizard + AI + comments + deck + settings + reviewer — ~90h of work whose result nobody sees until week 2. M7-spike trades feature surface for feedback latency: ship something a consultant can break in a week, learn from what breaks, design M8 with that knowledge.

---

## What M7-spike does (scope)

1. **Launches into a single-document shell.** No library, no install wizard, no router. `src/App.tsx` holds React state for "is a doc open?"; switches between a welcome screen and a single DocumentView.
2. **File → Open: native dialog → pick a YAML → render in the editor.** Uses `@tauri-apps/plugin-dialog` for the picker, `read_yaml_file` IPC for the read, the existing `src/editor/file-open.ts` helper for YAML → DocModel parsing.
3. **Edit the document via the existing Editor surface.** `src/editor/Editor.tsx` (TipTap) wired to the loaded DocModel via the existing mapping orchestrator (`src/editor/mapping.ts`).
4. **Insert blocks via the BlockPalette.** The existing `src/editor/BlockPalette.tsx` component (15 default blocks, fully implemented, never previously mounted) is mounted in DocumentView. Triggered by a `+` toolbar button OR the `/` keyboard shortcut. `generatedBlocks` prop is `[]` for M7-spike (runtime loading lands in M8 T-132).
5. **File → Save / Save As: write back to YAML.** Save writes to the existing path via `write_yaml_file` IPC; Save As prompts via native save dialog, writes to chosen path, switches the active path. Out-of-library toast is M8-meaningful (no configured library folder yet in M7-spike, so it never fires).
6. **File → Export PDF: pre-render HTML → write to temp → open in user's default browser.** The user finishes the export with `Cmd-P` / `Ctrl-P` → "Save as PDF" in their browser. See §Browser PDF handoff below.
7. **Errors don't crash the app.** Top-level `AppErrorBoundary` + `withRenderWatchdog` wrap on DocumentView per D-36 / D-39.

---

## What M7-spike does NOT do (deferred)

The disconnect between "built modules" and "wired surface" is intentional in M7-spike. These surfaces exist as tested code; M8+ wires them.

| Surface | Built? | Wired in M7-spike? | Where wired |
|---|---|---|---|
| Install wizard (`src/setup/install.ts`) | ✓ (CLI) | ✗ | M8 T-127 (GUI folder picker) |
| Library view (`src/library/`) | ✓ (pure logic) | ✗ | M8 T-128 + T-129 (card grid + filters) |
| Document templates | ✗ (M8 T-130) | ✗ | M8 T-131 (Create from Template) |
| Generated-block runtime loading | ✓ (`src/setup/load-generated-blocks.ts`) | ✗ | M8 T-132 (palette extension) |
| Deck renderer (`src/renderer/DeckRenderer.tsx`) | ✓ | ✗ | M10 (deck view) |
| Comments + AI proposals (`src/comments/`) | ✓ | ✗ | M9 (review panel + AI flow) |
| Cost-ledger surface (`src/cost-ledger/`) | ✓ (TS) | ✗ | M9 (AI calls + Rust migration) |
| Reviewer mode | ✓ (logic) | ✗ | M11 |
| Settings panel | partial (autosave knob in config only) | ✗ | M9 (deferred-UI feature list) |
| Keychain wiring (`get_secret` / `set_secret`) | stub | ✗ | M9 (LLM keys) |
| The other 14 IPC commands | mixed (real-ish or stubs) | ✗ | M8/M9 as needed |
| Router / multi-doc / multi-window | n/a | ✗ | M8 (router); M9+ (tabs); future (multi-window) |
| Signed installers / auto-updater | scaffold (T-110) | n/a | Phase 9 (T-108, T-109) |

M7-spike touches **only 3 of the 17 IPC commands**: `read_yaml_file` and `write_yaml_file` get hardened (T-117); `export_pdf` gets reimplemented as browser-handoff (T-118, semantics change documented in TAURI_IPC.md). The other 14 stay as their current registered stubs.

---

## Wireframe

### State 1 — Welcome (no document loaded)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  File ▾                                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                                                                              │
│                          ┌─────────────────────────┐                         │
│                          │    Document System       │                         │
│                          │                          │                         │
│                          │  [  Open Document  ]     │                         │
│                          │                          │                         │
│                          └─────────────────────────┘                         │
│                                                                              │
│                                                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

Minimum chrome: just the File menu and an "Open Document" button centered in the window. Clicking the button is identical to File → Open.

### State 2 — DocumentView (a document is loaded)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  File ▾                                       Acme Q3 Proposal.yaml   ●     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──┐                                                                         │
│ │+ │ ┌──────────────────────────────────────────────────────────────────┐    │
│ └──┘ │                                                                   │    │
│      │  # Acme Q3 Proposal                                               │    │
│      │                                                                   │    │
│      │  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed    │    │
│      │  do eiusmod tempor incididunt ut labore et dolore magna aliqua. │    │
│      │                                                                   │    │
│      │  ┌─ Callout ─────────────────────────────────────────────┐       │    │
│      │  │ Key insight: …                                         │       │    │
│      │  └────────────────────────────────────────────────────────┘       │    │
│      │                                                                   │    │
│      │  [Cursor here] ▌                                                  │    │
│      │                                                                   │    │
│      └──────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ● = autosave in flight (debounce from T-82, default 2s)                     │
│  + = BlockPalette trigger (also "/" keyboard shortcut)                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

The DocumentView is essentially the existing `DocumentRenderer` + `Editor` composition, full-window, plus:
- a `+` button in the top-left toolbar (or wherever the existing Editor toolbar lives) that opens the BlockPalette
- title-bar showing the current file's basename + a dot indicator for autosave-in-flight
- the File menu (Open / Save / Save As / Export PDF)

### State 3 — BlockPalette open

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  File ▾                                       Acme Q3 Proposal.yaml         │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌──┐                                          ┌─────────────────────────┐   │
│ │+ │ ┌────────────────────────────────────┐   │  Insert block            │   │
│ └──┘ │  …                                 │   │ ─────────────────────── │   │
│      │  …                                 │   │  Prose                   │   │
│      │  …                                 │   │  Heading                 │   │
│      │  …                                 │   │  Bulleted list           │   │
│      │  …                                 │   │  Numbered list           │   │
│      │  …                                 │   │  Callout                 │   │
│      │  …                                 │   │  Pull-quote              │   │
│      │  …                                 │   │  Chart                   │   │
│      │  …                                 │   │  Image                   │   │
│      │  …                                 │   │  Table                   │   │
│      │  …                                 │   │  Diagram                 │   │
│      └────────────────────────────────────┘   │  Side-by-side            │   │
│                                                │  KPI band                │   │
│                                                │  Risk matrix             │   │
│                                                │  People                  │   │
│                                                │  Reference list          │   │
│                                                │                          │   │
│                                                │ (M7-spike: 15 default;   │   │
│                                                │  M8 adds generated)      │   │
│                                                └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

The palette uses the existing `BlockPalette.tsx` component without modification. Triggered by the `+` button or `/` keyboard shortcut. Clicking an entry fires the matching TipTap `insertXxx` command on the editor and closes the palette.

---

## State model

M7-spike's app state is **a single React state hook in `src/App.tsx`** — no router, no Redux, no Zustand, no context (except for `BrandProvider`, which already exists).

```ts
type AppState =
  | { kind: "welcome" }
  | {
      kind: "document";
      path: string;             // absolute path to the YAML on disk
      doc: DocModel;            // parsed in-memory representation
      dirty: boolean;           // is there an unsaved edit?
      paletteOpen: boolean;     // is BlockPalette visible?
    };
```

Transitions:

```
welcome ── File → Open (or click "Open Document") ──> document
document ── File → Open (a different file) ─────────> document (new path)
document ── (Open dialog cancelled) ────────────────> unchanged
document ── AppErrorBoundary reset (only on caught
            top-level error; user clicks "Back to
            welcome screen" in the error panel) ────> welcome  [recovery only]
welcome ── (no exit — closing the window quits app)
```

There is **no user-initiated `welcome ← document` transition** in M7-spike — no File → Close, no "X" on the document title. The only path back to welcome is the **error-only reset**: when `AppErrorBoundary` (T-122) catches a top-level render exception that escapes per-block boundaries, the error panel shows a "Back to welcome screen" button as the recovery escape hatch. This is exceptional, not part of normal use. A user-initiated "close document" action (with the dirty-doc confirmation it would need) is deferred to M8+ where library-then-document navigation needs a non-error close path.

**Implication for T-122:** the error reset transition discards `state.doc` and `state.path` without saving (the document is already in an error state; any unsaved edits live only in the React state hook). T-122's design MUST make this consequence visible: the error panel copy reads "Document failed to render — unsaved edits may be lost. Try reopening the file, or return to the welcome screen." T-122 tests cover the transition.

> **Note (M8 forward-ref):** M8 T-126 introduces `src/ui/router/Routes.tsx` with typed routes `{ kind: 'welcome' | 'folder-picker' | 'library' | 'document' }`. The `document` route in M8 carries `{ openDocs: Array<{ id, path }>, activeIndex }` to leave room for browser-style tabs in M9+. M7-spike's single React state hook is a deliberate simplification that the M8 router refactor will absorb without rearchitecting the underlying DocumentView component.

---

## Component breakdown

| Component | File | Built? | M7-spike change |
|---|---|---|---|
| `App` | `src/App.tsx` | stub (returns null) | rewritten as single-state shell (T-119) |
| `MenuBar` | `src/ui/menu/MenuBar.tsx` | new (T-121) | top-level menu container, hosts FileMenu |
| `FileMenu` | `src/ui/menu/FileMenu.tsx` | new (T-121) | Open / Save / Save As / Export PDF wiring |
| `WelcomeScreen` | `src/ui/views/WelcomeScreen.tsx` (or inline) | new (T-119) | minimal "Open Document" button |
| `DocumentView` | `src/ui/views/DocumentView.tsx` | new (T-120) | wires DocumentRenderer + Editor + autosave + BlockPalette |
| `AppErrorBoundary` | `src/ui/AppErrorBoundary.tsx` | new (T-122) | top-level boundary wrapping DocumentView |
| `BlockPalette` | `src/editor/BlockPalette.tsx` | ✓ | mounted in DocumentView (T-120b); no change to component itself |
| `Editor` | `src/editor/Editor.tsx` | ✓ | unchanged; consumed by DocumentView |
| `DocumentRenderer` | `src/renderer/DocumentRenderer.tsx` | ✓ | unchanged; consumed by DocumentView and by `renderStaticHtmlForExport` |
| `render-static-html` | `src/export/render-static-html.ts` | new (T-118) | renderer-safe pure function for browser PDF handoff |
| `withRenderWatchdog` | `src/block-primitives/RenderWatchdog.tsx` | ✓ | wraps DocumentView per D-39 (T-122) |

---

## File menu wiring (T-121)

Standard convention for Save / Save As (per grilling Q10):

### Open

- Invokes `@tauri-apps/plugin-dialog`'s `open({ filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }] })`.
- On selected path: `read_yaml_file(path)` → parse via existing `src/editor/file-open.ts` → set state to `{ kind: 'document', path, doc, dirty: false, paletteOpen: false }`.
- On dialog cancel: state unchanged.
- On parse / IPC error: show toast "Couldn't open <basename>: <ipcError.message>"; state unchanged.

### Save

- If `state.kind === 'document'` and `state.path` exists: serialize `state.doc` via existing YAML formatter → `write_yaml_file(state.path, yaml)` → toast "Saved." → mark `dirty: false`.
- If somehow there's no path (cannot happen in M7-spike since every doc was opened from disk; but defensive): fall through to Save As.

### Save As

- Invokes `save({ filters: [{ name: 'YAML', extensions: ['yaml'] }], defaultPath: state.path })` from `@tauri-apps/plugin-dialog`.
- On selected path: serialize doc → `write_yaml_file(newPath, yaml)` → **switch `state.path` to the new location** (so future Saves go there; autosave switches with it; title bar updates) → toast "Saved As." → mark `dirty: false`.
- On cancel: state unchanged.
- **Out-of-library toast (M8-meaningful, dormant in M7-spike):** if the new path is outside `config.paths.cloudSyncRoot`, show "Saved to {path}. This document is outside your library folder and won't appear in the library." In M7-spike there's no configured library folder yet (no install wizard wired), so this toast never fires. T-121's unit tests still exercise the branch with a mocked config so the code path doesn't bit-rot before M8 makes it live.

### Export PDF

- Pre-renders the current doc to self-contained HTML via `renderStaticHtmlForExport(state.doc, brand)` (T-118).
- `invoke('export_pdf', { html, suggestedName: '<docBasename>.pdf' })` → returns `{ kind: 'browser_handoff', path: '/tmp/.../docsystem-export/.../foo.pdf.html' }`.
- `invoke('plugin:shell|open', { path: returnedTempPath })` (via `@tauri-apps/plugin-shell`) → opens the temp HTML in the user's default browser.
- Tauri 2.x's shell plugin requires BOTH the capability ACL (`shell:allow-open` with the temp-dir path scope in `main-window.json`) and a `plugins.shell.open` regex in `tauri.conf.json`. The capability decides which windows may call `open`; the plugin regex decides which paths and URLs are accepted. Configuring only the ACL produces the plugin's "purposefully impossible regex" runtime denial.
- Toast: "Opened in your browser — use Cmd-P / Ctrl-P to save as PDF."

### Autosave (inherited from T-82, not re-implemented)

- The existing `src/editor/autosave.ts` debouncer (default 2s, configurable via `AppConfig.editor.autosaveDebounceMs`) fires `write_yaml_file(state.path, yaml)` after the debounce.
- **Always writes to `state.path`.** Save As changes `state.path` → next autosave goes to the new location automatically. No special handling required.
- Autosave is silent (no toast); only the `●` indicator in the title bar reflects in-flight writes.

---

## Browser PDF handoff (T-118)

**Task ownership.** T-118 ships the "engine" only — `renderStaticHtmlForExport` + the `export_pdf` Rust IPC + the shell-plugin registration + the temp-dir cleanup hook + Cargo/npm dep adds + tests + `TAURI_IPC.md` update. **T-118 produces no UI components.** The File → Export PDF menu item, the `shell.open` invocation, and the "Opened in your browser…" toast all live in `src/ui/menu/FileMenu.tsx` (T-121). This split keeps the IPC + pre-render contract independently testable (T-118's JS smoke test invokes `export_pdf` directly, no menu involved) and avoids duplicating menu items across two tasks.

The M7-spike design for PDF export is a **two-step UX, zero-packaging** choice. Reasons:

1. **Zero added install surface.** Shipping a one-click in-app PDF requires bundling Playwright + a Node sidecar + a Chromium binary — ~120-180 MB per platform, 2-3 days of packaging engineering. That's a v1.1 task (see `docs/TASKS.md` "Future task note — post-M7 / v1.1") and explicitly outside M7-spike scope.
2. **Deterministic-enough fidelity.** Pre-rendered self-contained HTML + the user's browser print engine produces a result that's "good enough for v1" for proposals and reports. Most consultants already know `Cmd-P` → "Save as PDF" — the UX surprise is minimal.
3. **Mermaid + ECharts work in the browser without Node.** The existing `Diagram` and `Chart` blocks already render in the renderer process; reusing them via `renderToStaticMarkup` + `mermaid.render()` + `echarts.renderToSVGString()` produces inline SVGs in the exported HTML.

### Pre-render pipeline (`src/export/render-static-html.ts`, T-118)

```ts
export async function renderStaticHtmlForExport(
  doc: DocModel,
  brand: BrandTokens,
  docFolderPath: string,
  sharedFolderPath: string
): Promise<string>;
```

1. Resolve all `mermaid` blocks → call `mermaid.render(id, src)` → get SVG string → replace block content with SVG.
2. Resolve all `echarts` blocks → `echarts.init(offscreenEl, null, { renderer: 'svg' }).renderToSVGString()` → SVG string.
3. Resolve all `image` blocks via the existing brand-token asset resolver, then inline them as `data:` URIs using the scoped `read_binary_file` IPC. Per-image cap: 5 MB. Total image payload cap: 50 MB. Over-cap images fall back to an inline "Image too large to export" SVG placeholder.
4. Render the doc tree via `renderToStaticMarkup(<DocumentRenderer doc={doc} brand={brand} imageDataUris={...} />)`.
5. Wrap the rendered HTML in:
   ```html
   <!doctype html>
   <html>
     <head>
       <meta charset="utf-8">
       <title>{doc.meta.title}</title>
       <style>
         @page { size: A4 portrait; margin: 1.5cm; }
         /* inlined brand-derived CSS */
       </style>
     </head>
     <body>{rendered}</body>
   </html>
   ```
6. Return the full HTML string. **Zero external asset refs** (all images inlined as `data:` URLs from the existing brand-token resolver), **zero `<script>` tags** (renderer is purely SSR for the export path).

### Rust side (`src-tauri/src/ipc/pdf.rs`, T-118)

Replaces the current no-op stub. Accepts `{ html: String, suggestedName: String }`. Writes the HTML to `<tmpdir>/docsystem-export/<uuid>/<sanitizedName>.html`. Returns `{ kind: 'browser_handoff', path: String }`.

Temp file location + cleanup policy: **system temp dir (`std::env::temp_dir()`) + UUID subfolder; cleanup on next launch** (resolved by T-116 Decision #2 — see §Architectural decisions). On Tauri's `setup` hook, the app sweeps `<tmpdir>/docsystem-export/` via `fs::remove_dir_all` before any window opens. Idempotent + OS-friendly + no orphan files left after a crash.

Suggested-name sanitization: the `suggestedName` parameter is sanitized to `[A-Za-z0-9._ -]+` (other characters replaced with `_`), leading dots stripped, max length 200 chars (Windows path-length safety), and the final concatenated path is `Path::canonicalize`-validated to live under `<tmpdir>/docsystem-export/` before being returned. Tests in T-118 cover the path-traversal rejection case. (See T-116 Decision #2 for the full contract.)

### Brand source

**Hardcoded `brand.example.yaml`** for M7-spike (resolved by T-116 Decision #1 — see §Architectural decisions). Loaded via a shared module `src/brand/defaultBrand.ts` (T-120 output) that owns the Vite raw import + the one-time parse:

```ts
// src/brand/defaultBrand.ts
import brandYaml from '../../brand.example.yaml?raw';  // src/brand → src → repo root
import { parse } from 'yaml';
import { BrandTokensSchema, type BrandTokens } from '../schema/brand';

export const defaultBrand: BrandTokens = BrandTokensSchema.parse(parse(brandYaml));
```

DocumentView (and `renderStaticHtmlForExport`) both import `defaultBrand` from `src/brand/defaultBrand.ts`. This keeps the Vite raw import in exactly one place — readable, testable, and easy for M8/M9 to swap when a user-configurable brand-picker lands. M8+ may add a brand-picker / brand-folder surface (see `docs/SETUP_INSTALL_FLOW.md` Step 3 for the future contract).

---

## Watchdog + error boundary (T-122)

Per ADR-0001 (no iframe sandbox; runtime watchdog is the trust boundary) and D-39 (perf budget):

- `DocumentView` is wrapped with `withRenderWatchdog` (existing HOC in `src/block-primitives/RenderWatchdog.tsx`).
- A new `AppErrorBoundary` (T-122) wraps DocumentView in `src/App.tsx`. A thrown block renders `RenderFailedPlaceholder` for that block; if the error escapes the per-block boundary, AppErrorBoundary catches it and renders a top-level error panel reading "Document failed to render — unsaved edits may be lost. Try reopening the file, or return to the welcome screen." The panel has two buttons: "Try reopen" (re-invokes the open flow on the current `state.path`) and "Back to welcome screen" (the **error-only reset** transition documented in §State model — discards `state.doc` + `state.path` and returns to the welcome state).

The combination of per-block placeholder + per-DocumentView error boundary means a single bad block never crashes the app, and a catastrophic doc-level failure surfaces gracefully.

---

## Architectural decisions (T-116 — CLOSED)

> **Status:** RESOLVED 2026-05-26 by T-116. The two questions T-115 queued have explicit calls below. T-117..T-123 may now fire.

### Decision #1 — Brand source for the spike

**Decision: (a) — hardcoded `brand.example.yaml`, loaded via Vite raw import at build time.**

- **Options considered:**
  - **(a) Hardcoded `brand.example.yaml`** — load at build time via `import brandYaml from '../brand.example.yaml?raw'`; parse once on app boot.
  - **(b) File → Open Brand surface** — separate File menu item that prompts for a brand YAML path, validates against `BrandTokensSchema`, persists to config.
- **Why (a):** the spike's purpose is to validate the editor surface end-to-end. Adding a brand-picker doubles the install surface (a second file dialog, brand-validation error states, brand-config persistence) for zero learning about the editor. `brand.example.yaml` is already maintained as the canonical reference brand for tests and demos; reusing it costs nothing.
- **Why not (b):** brand-folder selection is a real consultancy concern (each firm has their own brand book), but the right place to surface it is the M8 install wizard or M9 settings panel — where multi-field config (folder + identity + LLM keys) already needs UI. Folding brand-picker into M7-spike would force half of M8's settings UI in early.
- **Implementation contract for T-120:**
  - T-120 adds `src/brand/defaultBrand.ts` — a tiny module that performs `import brandYaml from '../../brand.example.yaml?raw'` (relative path from `src/brand/` up to repo root), parses with `yaml.parse`, validates against `BrandTokensSchema`, and exports a single `defaultBrand` constant. Module-level evaluation runs once at load time.
  - DocumentView imports `defaultBrand` from `src/brand/defaultBrand.ts` and passes it to `<DocumentRenderer brand={defaultBrand}>`. `renderStaticHtmlForExport` (T-118) imports the same constant when called.
  - The brand import lives in exactly one file. DocumentView does NOT do the Vite raw import directly — that would put a relative path (`../../../brand.example.yaml?raw`) in `src/ui/views/DocumentView.tsx`, which is both error-prone and harder to mock in tests.
  - No brand-related UI in M7-spike: no menu items, no settings, no toasts.
- **M8 forward-reference:** T-127's folder-picker stays minimal (single dialog, just `paths.cloudSyncRoot`); brand-folder selection lands later — M9 or M9+ when AI cost attribution and identity entry also need surfacing.
- **Consumer tasks:** T-120 (DocumentView mount), T-118 (`renderStaticHtmlForExport` signature).

### Decision #2 — Temp HTML file location + cleanup policy

**Decision: (a) + (ii) — system temp dir (`std::env::temp_dir()`) + UUID subfolder + cleanup on next app launch.**

- **Options considered:**
  - **Location: (a) `std::env::temp_dir()`** vs **(b) app config dir.**
  - **Cleanup: (i) on app quit** vs **(ii) on next launch** vs **(iii) never (rely on OS temp-dir cleanup).**
- **Why (a) — temp dir:** that's literally what the OS temp dir is for. Putting transient export artefacts in the app config dir would pollute a user-facing location, surprise consultants on backup tools, and create a "what is this file?" recovery question every time we crash with files left behind.
- **Why (ii) — cleanup on next launch:** on-quit cleanup (i) requires an `app.on_window_event(WindowEvent::CloseRequested ...)` hook that runs reliably across macOS (Cmd-Q), Windows (X button), Linux (kill signals), AND crashes. On-launch cleanup (ii) is a single function called from `main()` before any export happens — works in 100% of scenarios including crash recovery. (iii) "never" is technically defensible (OS reaps temp eventually) but a consultant exporting 5 docs/day for a month would leave 150 abandoned ~2 MB HTML files in their temp dir — visible to `du` audits and "what's filling my disk?" investigations.
- **Concrete contract for T-118:**
  - **Root path:** `<tmpdir>/docsystem-export/` where `<tmpdir> = std::env::temp_dir()`.
  - **Per-export path:** `<tmpdir>/docsystem-export/<uuid-v4>/<sanitized-base-name>.html`. The UUID subfolder isolates concurrent exports and lets the next-launch sweep be a simple `remove_dir_all`.
  - **Sanitization:** the steps applied to `suggestedName` (in order):
    1. **Strip a trailing `.pdf` (case-insensitive)** if present. The renderer-side FileMenu (T-121) passes a name like `"Proposal.pdf"` for consistency with the user's "Save as PDF" mental model, but the temp file is HTML — we don't want `Proposal.pdf.html` cluttering the temp dir. So the contract is: callers MAY include `.pdf`; Rust strips it before appending `.html`.
    2. Sanitize the remaining base name to `[A-Za-z0-9._ -]+` (other characters replaced with `_`); strip leading dots; clamp to 200 chars (Windows path-length safety).
    3. The final concatenated path is `Path::canonicalize`-checked to confirm it lives under `<tmpdir>/docsystem-export/` (defence-in-depth against path traversal even after sanitization).
  - **Cleanup function:** `cleanup_export_temp_dir()` called once from `lib.rs` `setup` hook (Tauri's startup phase, before any window opens). Implementation: `let root = env::temp_dir().join("docsystem-export"); if root.exists() { let _ = fs::remove_dir_all(&root); }`. Errors are logged (via `log::warn!`) but never propagate — the export still works on a fresh `<uuid>` subfolder created on demand.
  - **Per-export setup:** `export_pdf` creates `<tmpdir>/docsystem-export/<new-uuid>/` lazily via `fs::create_dir_all` before writing.
  - **Known limitation (accept for M7-spike, revisit in M9+):** because cleanup wipes the entire `docsystem-export/` tree on launch, a previously-exported temp HTML disappears the next time the app starts — even if the user still has the export tab open in their browser and tries to reload it. Acceptable for the spike (consultants are guided to `Cmd-P` immediately after the tab opens, before reloading); M9+ may switch to TTL-based cleanup (sweep only entries older than 24h, or sweep individual `<uuid>` dirs on a per-export quit hook) once consultant testing surfaces the tab-reload friction in real workflows.
- **Return contract:** `export_pdf(html, suggestedName) -> Result<ExportHandoff, IpcError>` where `ExportHandoff = { kind: 'browser_handoff', path: String }`. The `path` is what the renderer passes to `shell.open`.
- **Why not write the user-facing PDF directly to the export dir:** the spike doesn't produce a PDF — the user does (via browser Cmd-P). The temp HTML is intermediate; once the browser opens it, the consultant saves the PDF wherever they want. We never own the final artefact.
- **Consumer tasks:** T-118 (`export_pdf` Rust impl + the new `setup`-phase cleanup hook), T-121 (FileMenu invokes the IPC + `shell.open`).

### Closed-decision recap

| # | Decision | Consumer | Status |
|---|---|---|---|
| 1 | Brand source = hardcoded `brand.example.yaml` (Vite raw import, build-time) | T-120 + T-118 | **CLOSED** |
| 2 | Temp HTML = `std::env::temp_dir() + /docsystem-export/<uuid>/` + cleanup on next launch (sweep `docsystem-export/`) | T-118 + T-121 | **CLOSED** |

T-117..T-123 are unblocked. Future amendments to this spec (M8+) append new dated sections; this T-116 closure block stays as-is for audit trail.

---

## Performance budgets (D-39)

M7-spike inherits the existing perf budgets from D-39 and ADR-0001:

- **DocumentView mount time:** ≤ 500ms p95 for sample-proposal.yaml (existing renderer benchmark target).
- **Per-block render time:** ≤ 50ms p95 (existing watchdog threshold; nothing M7-spike-specific).
- **Autosave latency:** debounce 2s default; the actual `write_yaml_file` IPC round-trip ≤ 100ms p95 (small file, local disk).
- **PDF pre-render:** `renderStaticHtmlForExport` ≤ 2s p95 for sample-proposal.yaml (no explicit watchdog; this is a user-initiated action with a clear "processing…" UI state).

No new benchmark targets are introduced. T-89c's perf-benchmark harness continues to pass.

---

## Keyboard shortcuts (M7-spike inventory)

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + O` | File → Open |
| `Cmd/Ctrl + S` | File → Save |
| `Cmd/Ctrl + Shift + S` | File → Save As |
| `Cmd/Ctrl + P` | File → Export PDF (note: native browser print is `Cmd-P` AFTER the temp HTML opens) |
| `/` | Open BlockPalette (when editor has focus and cursor is at a "fresh paragraph" position — same heuristic Notion uses) |
| `Esc` | Close BlockPalette without inserting |

Standard editor shortcuts (undo, redo, formatting) come from the existing Editor.

---

## Accessibility

- The welcome screen `<button>` has accessible name "Open Document".
- DocumentView has a `<main>` landmark; the BlockPalette popup gets `role="dialog"` + `aria-label="Insert block"` + focus-trap when open.
- The MenuBar uses native `<menu>` / `<menuitem>` semantics via the underlying Tauri menu API (or a `role="menubar"` + `role="menuitem"` polyfill if M7-spike uses an HTML menu — T-121 picks the approach).
- All keyboard shortcuts above are operable without a mouse.

No new accessibility commitments beyond existing-app surface conventions.

---

## File locations

```
src/
  App.tsx                                 # rewritten (T-119) — single-state shell
  brand/
    defaultBrand.ts                       # new (T-120) — owns the Vite raw import
                                          #   of brand.example.yaml (only place the
                                          #   asset path lives in source); parses
                                          #   + validates once at module load
  ui/
    AppErrorBoundary.tsx                  # new (T-122) — panel w/ "Try reopen"
                                          #   + "Back to welcome" (error-reset)
    menu/
      MenuBar.tsx                         # new (T-121)
      FileMenu.tsx                        # new (T-121) — Open/Save/Save As/Export PDF
    views/
      DocumentView.tsx                    # new (T-120 + T-120b)
      (WelcomeScreen optional inline)
  export/
    render-static-html.ts                 # new (T-118) — engine, no UI
src-tauri/
  src/
    ipc/
      fs.rs                               # hardened read+write only (T-117)
      pdf.rs                              # body replaced with browser-handoff (T-118)
    lib.rs                                # register tauri_plugin_shell::init() +
                                          #   call cleanup_export_temp_dir() from
                                          #   setup hook (T-118)
  capabilities/
    main-window.json                      # add shell:allow-open (T-118)
  Cargo.toml                              # add uuid dep (T-118)
docs/
  UI_APP_SHELL.md                         # this file (T-115) + decisions appended by T-116
  TAURI_IPC.md                            # export_pdf section updated by T-118
tests/
  integration/
    m7-spike-harness.ts                   # T-123
    m7-spike-happy-path.test.ts           # T-123
    m7-spike-error-paths.test.ts          # T-123
  export/render-static-html.test.ts       # T-118
  ipc/fs.smoke.test.ts                    # T-117
  ipc/pdf.smoke.test.ts                   # T-118
  ui/App.test.tsx                         # T-119
  ui/views/DocumentView.test.tsx          # T-120 + T-120b extensions
  ui/menu/FileMenu.test.tsx               # T-121
  ui/AppErrorBoundary.test.tsx            # T-122
```

---

## What this spec deliberately doesn't include

M7-spike-scope is narrow on purpose. Things this spec **does not describe** because they're not in M7-spike:

- **No library view** (card grid, folder scan, filters). See `docs/UI_LIBRARY.md` for the M8 design (T-128 + T-129).
- **No install wizard** (folder picker, identity entry, LLM keychain setup). The CLI install in `src/setup/install.ts` stays available for devops batch rollouts; the GUI folder picker is M8 T-127.
- **No comments / AI proposal flow.** See `docs/UI_REVIEW_PANEL.md` for the M9 design.
- **No deck rendering or navigation.** M10.
- **No reviewer mode.** M11.
- **No settings panel.** M9 surfaces the deferred-UI list (autosave debounce slider, cost-tracking toggle, library folder re-pick, identity, brand picker, in-app generated-block creation).
- **No keychain wiring.** No AI in M7-spike means no keys to store; M9 wires `get_secret` / `set_secret`.
- **No router.** Single-state hook in App.tsx is fine for two states. M8 T-126 introduces `src/ui/router/Routes.tsx` with typed routes.
- **No multi-document / multi-window.** One doc at a time, one window. Tabs are M9+ (route shape supports them per T-126). Multi-window is undated future work.
- **No drag-and-drop file open.** Native dialog only.
- **No "Recent documents" menu.** No `lastOpenPath` persistence either — per grilling Q9 the app always starts at welcome (M7-spike) or library (M8). Last-open persistence is deferred until consultant testing surfaces it as friction.
- **No signed installers / auto-updater.** Phase 9 (T-108, T-109).

---

## Acceptance checklist (per T-115)

T-115 ships this spec; T-116 appends the two decisions; T-117..T-123 implement against it.

- [x] Describes the single-document shell architecture (no router, no install wizard, no library scan).
- [x] Documents the File menu wiring (Open / Save / Save As / Export PDF) with explicit Save vs Save As semantics.
- [x] Documents the browser PDF handoff pipeline (`renderStaticHtmlForExport` → IPC writes temp → `shell.open`).
- [x] Documents the watchdog + error-boundary wrap.
- [x] Documents the BlockPalette mount + insertion mechanism (T-120b scope).
- [x] Lists the two T-116 decisions (brand source + temp-file policy/location) with recommendations.
- [x] Cross-references the deferred work (library, comments, deck, install wizard, etc.) so M8+ plans can pick up the right design without re-discovering this spike's choices.
- [x] Explicitly enumerates what M7-spike doesn't do (the "deferred to M8+" matrix above) and why.
- [x] Lists file locations + perf budgets + keyboard shortcuts + accessibility commitments.

The M7-spike acceptance gate (per BUILD_BRIEF.md §3 M7) is equivalent to T-123 passing — that's not this task's gate.

---

## M7-spike change log

- 2026-05-26 — T-115: initial spec.
- 2026-05-26 — T-116: rewrote the "Architectural decisions" section as CLOSED. Decision #1: brand = hardcoded `brand.example.yaml` (Vite raw import). Decision #2: temp HTML in `std::env::temp_dir()/docsystem-export/<uuid>/` + cleanup-on-next-launch via Tauri `setup` hook. T-117..T-123 unblocked.
- 2026-05-26 — M7 spec review fixes (non-task amendment commit): (a) brand import now lives in `src/brand/defaultBrand.ts` instead of being raw-imported from inside DocumentView (the original `'../brand.example.yaml?raw'` path was wrong for `src/ui/views/`); T-120 outputs updated. (b) T-118 explicitly produces no UI — `ExportPdfMenuItem.tsx` removed from T-118 outputs; T-121's `FileMenu.tsx` owns ALL menu UI for Export PDF. (c) Added the error-only `document → welcome` reset transition (button on AppErrorBoundary panel; not a user-initiated close); T-122 outputs and acceptance updated. (d) Documented the known limitation that cleanup-on-launch invalidates previously-opened browser tabs (acceptable for spike; M9+ may revisit). (e) Rust strips a trailing `.pdf` from `suggestedName` before appending `.html`, so `Proposal.pdf` → `Proposal.html` not `Proposal.pdf.html`.
- M8 (T-124, future): appends an M8 section describing the router refactor, the folder-picker routing, the partial-config schema decision, and the multi-doc-ready route shape. M8 builds on this M7-spike spec rather than rewriting it.

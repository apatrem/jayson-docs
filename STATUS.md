# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-26T18:30:00Z
**State:** RUNNING
**Running on:** Claude Opus 4.7 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-117** — Harden read_yaml_file + write_yaml_file IPC (spike scope).
- Phase 7 (M7 — Document Editor Spike); Depends-on: T-116 (`[x]`); ~3h.

## Progress since the previous fire

- ✏ M7 spec review fixes (non-task amendment commit, no T-NN claimed) addressing reviewer findings from ChatGPT + Cursor Composer:
  - **P1 (brand import path):** `'../brand.example.yaml?raw'` from `src/ui/views/` is wrong — it resolves to `src/ui/brand.example.yaml`. Introduced `src/brand/defaultBrand.ts` as the single import + parse owner; DocumentView imports the parsed constant. T-120 outputs updated to include the new file and a test for it.
  - **P2 (Export PDF ownership split):** T-118 originally listed `src/ui/menu/ExportPdfMenuItem.tsx` in its outputs while T-121 also wired Export PDF in FileMenu — duplicate surface. T-118 outputs now stop at the engine (HTML pre-render + Rust IPC + capability); T-121's FileMenu owns ALL menu UI. UI_APP_SHELL.md `§Browser PDF handoff` opens with an explicit "Task ownership" callout.
  - **P3 (welcome ← document contradiction):** state model said "no welcome ← document transition" but error boundary had a "back to welcome" button. Added an explicit **error-only reset** transition with copy + design notes; T-122 outputs + acceptance updated to cover both "Try reopen" and "Back to welcome screen" callbacks.
  - **Cursor nit 1 (cleanup wipes still-open browser tabs):** documented as a known limitation in T-116 Decision #2 + the §Browser PDF handoff section. Acceptable for spike; M9+ may switch to TTL cleanup.
  - **Cursor nit 2 (`.pdf.html` naming):** Rust now strips a trailing `.pdf` (case-insensitive) from `suggestedName` before appending `.html`. So `Proposal.pdf` → `Proposal.html`. Sanitization steps documented in spec + T-118 outputs.
- ⚠ 0 tasks blocked this fire: none
- ⏸ 0 tasks marked waiting this fire: none
- ↩ 0 commits reverted this fire: none

## At a glance

Total tasks: 140   Done: 118 (84%)   Blocked: 0   Waiting: 2   Open: 19   Skipped: 1

## Recent commits

207ade4 T-116: resolve M7-spike architectural decisions (CLOSED)
30cfab0 T-115: write UI_APP_SHELL.md (M7-spike scope spec)
fffa50f Pin Rust 1.88.0 via rust-toolchain.toml in both Tauri crates
c67378b CI: bump Rust pin to 1.88.0 for locked transitive MSRV
7490096 CI: bump Rust pin to 1.85.0 for edition2024 lockfile deps
ab4283e CI: drop flaky third-party action downloads
54f90cd loop: halt to CI-FAILED — codeload.github.com action-download flake
71dfe82 CI: enforce cargo check --locked for both Tauri crates

## CI status (origin/main)

success (latest completed: 207ade4)

Loop is running cleanly — no action needed. T-117 (IPC hardening for the
2 fs commands the spike calls) fires next.

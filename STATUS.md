# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T13:47:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Next eligible task

**T-130** — Create 4 standard document templates (3h).
- Depends-on: none.
- **T-131** also eligible after T-130+T-128 are done (T-131 depends-on T-128, T-130).

## Progress since the previous fire

- ✅ **T-129 closed this fire** — Library view: filters + sort + search:
  - **`src/ui/library/LibraryView.tsx`** (UPDATED) — wired `FilterSidebar`, `SearchBar`, `DocList`
    from `src/library/` into the IPC-backed view; `applyFilters` + `applySort` applied via
    `useMemo`; sort `<select>` + Grid/List toggle rendered in sort row; initial filter state
    defaults to `ownerMode: "all"` so entries are visible without a known user email.
  - **`tests/ui/library/filters.test.tsx`** (NEW) — 11 tests: default shows all entries,
    filter sidebar renders, status filter hides non-matching, kind filter hides non-matching,
    search by client/project, sort select renders with expected options, sort updated-asc
    orders correctly, grid/list toggle switches aria-pressed, reset filters restores entries.
  - **`tests/ui/library/LibraryView.test.tsx`** (UPDATED) — removed `getByLabelText("Document cards")`
    queries that broke when card grid moved inside `DocList`.
  - All gates green: tsc ✓, lint ✓, 552/552 tests pass.

Scope expansion:
- `tests/ui/library/LibraryView.test.tsx` — updated T-128 tests to remove stale aria-label
  queries after T-129 changed the loaded state's rendered structure.

- ✅ **T-128 closed previous fire** — LibraryView scaffold + folder scan + "Use Sample" empty state.
- ⚠ 0 tasks blocked this fire
- ⏸ 0 tasks marked waiting this fire

## At a glance

Total tasks: 206   Done: 150 (73%)   Blocked: 0   Waiting: 2   Open: 53   Skipped: 1

## Recent commits

(pending this fire's commit)
T-128: library view scaffold + folder scan + empty-state "Use Sample"
Refactor: extract install config schema + library path utils
T-127: FolderPickerScreen — first-launch + missing-folder re-pick

## CI status (origin/main)

latest completed run on `main`: success (pre-T-129 push)

Loop is running cleanly — T-130 is next.

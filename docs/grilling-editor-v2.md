# Grilling notes — editor v2 (sidebar, sections, drag-drop, numbering, page breaks, spacing)

Working notes for an in-flight `grill-with-docs` session. Captures decisions as
they settle so the conversation can be compacted without losing state. Fold into
ADRs / docs/TASKS.md once grilling completes, then delete this file.

## Heading numbering (explanation, asked by user)

`numbered` on the heading block is **stored but unused today** — no renderer or
utility computes/prepends a number ("1", "1.1", "2.1"); it only round-trips and
sets `data-numbered` on the HTML. No cross-block counter exists. (The divider
block's `numbering` is an unrelated free-text label.) Whether to implement
computed numbering is an OPEN question below (item 4).

## Resolved decisions

### Item 2 — Section titles are nav-only  [DECIDED]
- `section.title` is **not rendered** into the document or export. It is an
  organizational label (PowerPoint-style) shown only in the section sidebar.
- Visible on-page headers come from **heading blocks**, never section titles.
- Migration: convert each of the 4 templates' section titles into a heading
  block at the top of the section; keep `section.title` as the nav label.
- Removes the in-doc editable section-title input added in increment 1 (title
  editing moves to the sidebar). Recorded in CONTEXT.md ("Section", "Section
  title"; deferred "flattening" note updated).

### Item 1 — Section sidebar  [DECIDED: scope]
- Left sidebar, **foldable**, lists **sections only** (flat, by title).
- Drag to **reorder sections** (moves the whole section's blocks).
- Click to **jump** to the section.
- **Rename** the section title inline here (it's nav-only).
- Must also provide **create / delete (and likely merge)** sections — there is
  no section-creation mechanism in the editor today.
- ROADMAP / deferred: a two-level outline (sections + their headings for
  click-jump). Sections-only for now.

## Open questions still to grill

- **Item 3 — block drag-reorder.** `src/editor/extensions/DragReorder.ts` exists
  but is DEAD (not registered, no drag handle, no tests). Decide: wire it +
  drag-handle UI; reorder within a section only (sections are `isolating`) vs
  also across sections; interaction with the sidebar's section reorder.
- **Item 4 — heading numbering.** Implement computed numbering? Scheme
  (flat "1." vs outline "1.2.1"), section-aware vs heading-level-only, how the
  per-heading `numbered` flag opts in/out, where the number renders (editor +
  export).
- **Item 5 — smart page-break insertion.** Options: a dedicated page-break block
  vs a per-block "break before" attr vs auto-pagination only. "Smart" = ?
  (Today: divider block forces `break-before: page`.)
- **Item 6 — vertical block spacing parameter.** Today a single brand-token
  `--doc-block-gap` (not user-editable). Make it a document-level setting with a
  default + editable value. Where to edit → proposed: a new document-meta
  pop-up that edits the `meta` block (no meta-editing UI exists today). Decide
  the popup scope (all meta fields? which are editable?).
- **Item 7 — per-block spacing override.** Custom spacing between two specific
  blocks: (a) override at the block location (a spacing attr on a block) vs
  (b) a dedicated spacing block. Grill the trade-off.

## Cross-cutting note
Multiple items add per-instance layout to the DocModel (spacing overrides, page
breaks). Watch the memo principle "visuals come from brand tokens, DocModel is
canonical/semantic" — prefer brand-token defaults + minimal, explicit
per-instance overrides over free-form styling.

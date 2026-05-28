# Single WYSIWYG editing surface; paged.js owns page view and print

**Status:** accepted

Now that every inline block renders as its output, the editor *is* the rendered
view, so we collapse the former dual-pane (read-only preview beside the editor)
into a **single WYSIWYG editing surface**. The always-on live preview is dropped
in favour of an on-demand, read-only **Page view** that paginates the DocModel
into real A4 pages via **paged.js** (MIT — satisfies the open-source-only
guardrail). The same paginated output is the PDF print path.

## Why

- The dual pane could never keep the two independently-flowing columns aligned
  row-for-row ("drift"); a single surface makes drift structurally impossible
  and gives more editing width. Block spacing and typography now live in one
  place (driven by brand tokens), not duplicated across renderer + node-views.
- The product still needs to *see page breaks* and produce clean PDFs. paged.js
  gives accurate pagination on demand and lets us render our **own** running
  header (logo + document title) and footer (page number) — so the printed PDF
  no longer shows the date or temp-file path.

## Consequences

- **Print is browser-handoff + our own header/footer.** The in-app Export PDF
  still opens HTML in the user's browser (no headless Chromium bundled in the
  desktop app). Chrome's *native* print header/footer is all-or-nothing and
  cannot render CSS page numbers, so the user must disable Chrome's "Headers and
  footers"; paged.js then supplies title + page number. This is the runtime
  reality behind D-22's "PDF output uses Playwright's headless Chromium" — that
  describes the CLI/batch path (`src/export/pdf.ts`), not the in-app handoff.
- The live ProseMirror editor is **not** paginated; Page view is a separate
  read-only mode. Editing stays continuous.
- Removing the preview pane changes `DocumentView` structure and its tests.

## Considered alternatives

- **Keep dual-pane, synchronize rows by measuring heights** — fragile, re-syncs
  on every keystroke/resize, poor performance on long docs. Rejected.
- **Approximate page breaks with CSS guides** — cheaper, no dependency, but
  break positions are inaccurate and it doesn't fix the print header/footer.
  Rejected for "see where page breaks" + clean PDF needing real pagination.
- **Bundle headless Chromium (Playwright) into the app for print** — full
  header/footer control without the browser, but heavy runtime footprint; the
  app deliberately hands printing to the user's browser. Deferred.

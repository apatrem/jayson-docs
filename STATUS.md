# Loop status — auto-generated; do not edit

**Last fire:** 2026-05-27T21:30:00Z
**State:** RUNNING
**Running on:** Claude Sonnet 4.6 at high
**Halt reason:** N/A
**Halted since:** N/A

---

## Progress since the previous fire

- ✅ **T-159 closed this fire** — `defineAuthoredBlock` declarative API design.
  `src/blocks/authored/defineAuthoredBlock.ts` (NEW): full type hierarchy for
  Authored blocks — `AttrFieldDef` (StringAttrField / EnumAttrField /
  NumberAttrField / BoolAttrField / RepeatedItemAttrField), `RenderNode`
  (TextRenderNode / HeadingRenderNode / BoxRenderNode / RowRenderNode /
  ColumnRenderNode / BadgeRenderNode / RichTextSlotRenderNode /
  ForEachRenderNode), `AuthoredBlockManifest`, and `defineAuthoredBlock()`
  factory stub (throws pending T-160).  ADR-0007 capability ceiling enforced
  structurally: no `tiptapNode`, `renderer`, `toPm`, `fromPm`, or function-typed
  field in `AuthoredBlockManifest` — atom-node, side-panel, and ECharts patterns
  are TypeScript compile errors.
  `reference/authored-block/` (NEW): worked example manifest
  (`sector-risk-summary.ts`), README covering constraints + codegen rules, and
  template test file.

- ✅ T-158 — vocabulary normalization (prior fire).
- ✅ T-157c — schema-side registry wire-through (prior fire).

## At a glance

Total tasks: 205   Done: 183 (89%)   Blocked: 0   Waiting: 2   Open: 19   Skipped: 1

## Next eligible task

**T-160** — `defineAuthoredBlock` runtime implementation (depends on T-159 ✓).  
**T-161** — Manifest header parser + serializer (depends on T-159 ✓).

Both T-160 and T-161 depend on T-159 only and are now eligible.
T-160 is lower-numbered; loop will pick it next.

## Recent commits

T-159: defineAuthoredBlock declarative API design
T-158: memo §3 + cross-reference cleanup
T-157c: schema-side registry wire-through
T-157b: renderer-side registry wire-through
T-157a: editor-side registry wire-through

## CI status (origin/main)

Latest run: success (post-T-158 push)

Loop is running cleanly — no action needed.

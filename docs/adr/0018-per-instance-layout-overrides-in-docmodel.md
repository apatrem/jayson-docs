# Minimal per-instance layout overrides live in the canonical DocModel

**Status:** accepted

The DocModel is canonical and semantic; the memo principle is "visuals come from
brand tokens." The editor-v2 work (heading numbering, page breaks, block
spacing) needs a few decisions that are genuinely per-document and per-block
*layout*, not brand-wide style. We resolve the tension with a single rule:
**brand tokens hold the defaults; the DocModel carries only a small, fixed,
enumerable set of explicit per-instance overrides — never free-form styling —
and any computed output is a projection, never stored.**

Concretely, this admits exactly:

- `breakBefore?: boolean` on `BlockBase` — "start this block on a new page".
- `spaceBefore?: number` on `BlockBase` — the gap above this block, as a multiple
  of `brand.spacing.unit` (min 0); clearable to re-inherit the document default.
- `meta.layout?: { blockSpacing?: number; numbering?: {...} }` — per-document
  overrides of the brand-default block gap and heading-numbering format.

Defaults live in brand tokens: a new `numbering.levelFormats` (+ separator) house
style, and the existing `spacing.unit` for the block gap (default 3×). The
override is **omitted whenever it equals the default**, so a clean document
serializes with no `layout` noise.

## Why

- These three knobs are real authoring needs (an appendix on its own page,
  tightening one gap, a doc-specific outline style) that brand-wide tokens
  cannot express — they vary per document or per block instance.
- Keeping them as a closed, named set (not a `style` bag) preserves the
  semantic-model guarantee: the schema still enumerates everything a block can
  carry, the closed editor schema stays assertable, and round-trips stay
  lossless. Free-form CSS in the model would forfeit all of that.
- Resolution happens once (brand default ⊕ optional override) and feeds **both**
  the editor surface and the export/Page renderer, so edit and print are
  identical. Numbers are computed by a pure function at render time and never
  persisted, matching the "projection, never canonical" stance.

## Consequences

- `BlockBase` gains two optional fields; every block's `allowedAttrs` and
  node-view round-trip must include them, and the closed-schema test updates.
  This is broad but shallow (mirrors the existing `note` field precedent).
- `MetaSchema` gains an optional `layout` group — the first non-bibliographic
  data in `meta`. It is edited via the new Document settings popup, not by hand.
- The bar for *future* additions is set here: a new per-instance layout knob is
  allowed only if it is a single, named, defaultable attribute with a brand-token
  default. Anything resembling free-form styling is rejected by this ADR.

## Considered alternatives

- **Brand tokens only (no per-document/per-block overrides).** Purest w.r.t. the
  memo principle and zero DocModel change, but cannot express per-document outline
  style, a one-off page break, or a single tightened gap. Rejected as too rigid.
- **A free-form `style`/CSS bag on blocks and meta.** Maximally flexible, but
  destroys the semantic-model and closed-schema guarantees and makes brand
  re-theming unreliable. Rejected.
- **Store computed heading numbers in the model.** Simpler renderers, but the
  numbers would drift on every reorder/insert and stop being a projection.
  Rejected in favour of a pure compute function shared by editor and export.

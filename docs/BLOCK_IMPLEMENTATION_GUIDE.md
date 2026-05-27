# Block Implementation Guide

**Purpose:** copy-pattern instructions for implementing Standard blocks using
the `defineBlock()` registry pattern. All 15 Standard blocks are implemented
and live under `src/blocks/<name>/`. This guide applies to adding new Standard
blocks or understanding the existing ones.

**Audience:** the developer (or LLM) implementing or modifying Standard blocks.

**Companion to:** `blocks.catalogue.yaml` (the setup-time spec for each block;
see §8 for its role), `reference/callout/` (canonical scaffold), `reference/chart/`
(worked example for complex blocks with a data panel).

> **Architecture note (ADR-0008):** as of M9a, every Standard block is a
> single-file manifest under `src/blocks/<name>/` using the `defineBlock()`
> factory. The old four-file split across `src/schema/blocks/`, `src/renderer/blocks/`,
> `src/editor/nodes/`, and `src/editor/mapping.ts` has been removed. The registry
> wires everything automatically — Editor.tsx, DocumentRenderer.tsx,
> mapping.ts, and src/schema/blocks/index.ts all derive from `loadAllBlocks()`/
> `loadAllSchemas()`.

---

## 1. The single-manifest pattern (mandatory for every Standard block)

Every Standard block ships as exactly three artifacts:

| Artifact | Path in repo | Purpose |
|---|---|---|
| `schema.ts` | `src/blocks/<name>/` | Pure Zod schema + TypeScript type + `schemaEntry`. No React/TipTap imports. |
| `index.tsx` | `src/blocks/<name>/` | Everything else: TipTap node, renderer, mapping helpers, `defineBlock()` default export. |
| `<name>.test.ts` | `tests/blocks/` | Five test layers (see §5) |

`defineBlock()` (from `src/blocks/defineBlock.ts`) returns a `BlockRegistryRecord`
consumed by two registries:

- **`src/blocks/schema-registry.ts`** — pure registry used by schema validation
  (`BlockSchema`, `Block` type). Imports from `schema.ts` only.
- **`src/blocks/runtime-registry.ts`** — full registry used by Editor.tsx,
  DocumentRenderer.tsx, and mapping.ts. Imports `defineBlock()` default exports.

Adding a block to `loadAllBlocks()` in `src/blocks/runtime-registry.ts` is the
**only manual registration step** — no changes to Editor.tsx, DocumentRenderer.tsx,
mapping.ts, or `src/schema/blocks/index.ts` are needed.

---

## 2. The implementation checklist (per Standard block)

### Step 1 — Read the spec
- Open `blocks.catalogue.yaml`, find the entry for your block.
- Note the `schema` (data shape), `appliesTo` (document/deck), `brandTokensUsed`,
  `llmUsage.when`/`avoid`.

### Step 2 — Write `src/blocks/<name>/schema.ts` (pure schema)
- Extend `BlockBaseSchema` (from `src/schema/blocks/block-base`) — gives you
  `id`, `type`, `note`.
- Add `type: z.literal("<block-id>")` as the discriminator.
- For each field in `blocks.catalogue.yaml`:
  - String → `z.string()` with appropriate min/max.
  - Enum → `z.enum([...])`.
  - Array → `z.array(...)` with `.min(N).max(M)` per the spec.
  - Nested object → inline schema with `.strict()`.
  - Rich-text → `ProseMirrorFragmentSchema`.
  - Asset path → `AssetPathSchema`.
- Add `.strict()` to the top-level object.
- Export the inferred type with `z.infer<typeof XxxBlockSchema>`.
- Export a `schemaEntry` constant (`satisfies { schemaName, schema, allowedAttrs, paletteLabel }`).
- **No React, TipTap, or renderer imports** — this file must stay pure (enforced by
  `tests/blocks/schema-purity.test.ts`).

### Step 3 — Write `src/blocks/<name>/index.tsx` (TipTap node + renderer + mapping)

Create the `defineBlock()` manifest. Follow `reference/callout/index.tsx` (simple)
or `reference/chart/index.tsx` (complex with data panel):

```typescript
import { defineBlock } from "../defineBlock";
// ... other imports

// TipTap node
export const XxxTipTapNode = Node.create({ name: "<block-id>", ... });

// Renderer
export const Xxx: FC<{ block: XxxBlock }> = ({ block }) => { ... };

// Mapping helpers
export function xxxBlockToProseMirror(block: XxxBlock): ProseMirrorNode { ... }
export function proseMirrorToXxxBlock(node: ProseMirrorNode): XxxBlock { ... }

// Registry manifest (default export)
export default defineBlock<XxxBlock>({
  schemaName: "<block-id>",
  schema: XxxBlockSchema,
  allowedAttrs: [...],
  paletteLabel: "...",
  tiptapNode: XxxTipTapNode,
  renderer: Xxx,
  toPm: xxxBlockToProseMirror,
  fromPm: proseMirrorToXxxBlock,
});
```

### Step 4 — Register in the runtime-registry

Open `src/blocks/runtime-registry.ts`. Add a single import and one entry:

```typescript
import xxxBlock from "./<name>";
// ...
export function loadAllBlocks(): readonly BlockRegistryRecord[] {
  return [
    // ... existing entries
    xxxBlock,
  ];
}
```

That's it. Editor.tsx, DocumentRenderer.tsx, mapping.ts, and
`src/schema/blocks/index.ts` all update automatically via the registry.

Also add the `schemaEntry` import to `src/blocks/schema-registry.ts`
(`loadAllSchemas()`) so schema-only validation covers the new block.

### Step 5 — Write the tests (`<name>.test.ts`)
- Five test layers per §5 below.

### Step 6 — Add a fixture entry to `examples/sample-proposal.yaml`
- If your block isn't yet exercised by the sample proposal, add a representative use.

### Step 7 — Add to the block palette
- The palette reads from the registry (`paletteLabel` + `llmUsage.when` from the catalogue).
  No manual step if the palette is already registry-driven; otherwise follow the
  `BlockPalette.tsx` pattern.

**Estimated effort per block: 4–6 hours** for simple blocks (prose, heading, image),
**8–12 hours** for complex blocks (chart, table, risk-matrix, roadmap).

---

## 3. Per-block notes (the harder ones)

Most blocks follow the callout pattern cleanly. These deserve specific attention:

### `chart` (block #5)
- The hardest block. Plan ≥ 12 hours.
- The renderer wraps ECharts directly. For the editor view, mount/dispose an
  ECharts instance inside the block node view; for the PDF export, pre-render
  to static SVG via ECharts's headless mode (no JS at PDF time).
- The data grid (D-24 side panel) is a separate React component (`src/blocks/chart/ChartDataPanel.tsx`) that mounts when a chart is selected.
- Excel-paste detection: in the data grid's paste handler, detect `\t`-separated (TSV) vs `,`-separated (CSV). For locale-dependent numbers (`1.234,56` vs `1,234.56`), defer to **O-05 open item** — ship with English-locale parsing only in v1.
- Brand integration: the chart's color palette comes from `brand.colors.chartPalette.qualitative` (or `.sequential` if `block.palette === "sequential"`).

### `table` (block #6)
- Cells are `ProseMirrorFragment` (rich text). The editor needs per-cell editable regions inside a `<table>` layout.
- TipTap's official `@tiptap/extension-table` does most of this, but it doesn't enforce a closed schema (it allows arbitrary HTML in cells). Wrap it with a custom node that constrains cell content to a single paragraph with marks-only.
- For PDF export: use CSS `break-inside: avoid` on `<tr>` to keep rows together; allow page breaks between rows.

### `risk-matrix` (block #11)
- Renders as a CSS Grid (2×2 or 3×3). Each risk is positioned by `x`/`y` coordinates.
- Editing UI: a small canvas where consultants click a cell to add a risk, then drag to reposition. Keep this in the side panel (consistent with the chart pattern from D-24).
- Severity color comes from `brand.colors.status.*`.

### `roadmap` (block #10)
- Effectively a custom Gantt renderer. Use the chart pattern — a side-panel data grid for workstreams + milestones, an ECharts custom-series renderer for visualization (ECharts supports Gantt-style via `custom` series).
- Date math: use `date-fns` for all date computations. ISO strings only on the wire.

### `team` (block #12)
- Photo paths are mostly `$brand:headshots.<name>` references resolved against the shared brand folder (D-21).
- Layout `"grid"`, `"hierarchical"`, `"list"` are visually distinct — each is its own renderer sub-component. Pick via `switch (block.layout)`.

### `diagram` (block #14)
- Mermaid source rendered via `@mermaid-js/mermaid` (or the official `mermaid` package, MIT).
- For PDF export: pre-render Mermaid to SVG at build time (Mermaid has a Node API). Do **not** call Mermaid during PDF rendering (it expects a browser DOM).
- Editor view: a side panel with a `<textarea>` for raw Mermaid source + a live-preview pane.

### `divider` (block #15)
- For `kind: "document"`: renders as a CSS `page-break-before: always`. No visible content.
- For `kind: "deck"`: becomes a full-screen divider slide using the `section-divider` slide layout (D-30). The block carries `label`, `subtitle`, `numbering`; the layout decides positioning.
- This block is *layout-affecting* in documents (forces a page break) — make sure the PDF export respects this.

---

## 4. Brand-token consumption pattern

Every block consumes brand tokens via two functions:

```typescript
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";

const MyBlock: React.FC<{ block: MyBlockType }> = ({ block }) => {
  const brand = useBrandTokens();

  // Direct values
  const baseSpacing = brand.spacing.unit;
  const bodyFont = brand.typography.fonts.body.family;

  // Token references (resolved via the helper)
  const primary = resolveBrandToken(brand, "colors.brand.primary");
  const surface = resolveBrandToken(brand, "colors.semantic.surfaceBackground");
  // `colors.semantic.surfaceBackground` is itself "neutral.200" — the helper
  // dereferences one level.

  // ...
};
```

**Rules:**
- Never hard-code a hex color, font-family string, or pixel value in a block component.
- Always go through `useBrandTokens()` — even for "I'll just hard-code white" cases.
- If you find yourself needing a value not in the brand tokens, **stop** and ask: is this a gap in `brand.example.yaml` that should be added, or is it block-internal logic (in which case derive it from existing tokens)?

---

## 5. The five test layers (per block)

Every block test file MUST have these five describe-blocks (use the callout test as a template):

### Layer 1 — Schema: valid fixtures
```typescript
describe("XxxBlockSchema — valid fixtures", () => {
  it("accepts a complete block with all fields", ...);
  it("accepts a block with only required fields", ...);
  it("applies defaults for omitted optional fields", ...);
});
```

### Layer 2 — Schema: invalid fixtures
```typescript
describe("XxxBlockSchema — invalid fixtures", () => {
  it("rejects an unknown enum value", ...);
  it("rejects a field exceeding maxLength", ...);
  it("rejects missing required fields", ...);
  it("rejects unknown keys (strict mode)", ...);
});
```

### Layer 3 — Renderer: HTML output
```typescript
describe("Xxx renderer", () => {
  it("renders a root element with data-block-id and data-block-type", ...);
  it("renders required fields", ...);
  it("omits optional fields when absent", ...);
  it("uses brand tokens (not hard-coded values)", ...);
  it("is deterministic (same input -> same output)", ...);
});
```

### Layer 4 — Mapping: round-trip
```typescript
describe("Xxx mapping (DocModel <-> ProseMirror)", () => {
  it("round-trips a minimal block losslessly", ...);
  it("round-trips a fully-populated block losslessly", ...);
});
```

### Layer 5 — Editor: TipTap commands
```typescript
describe("Xxx TipTap node", () => {
  it("registers an `insertXxx` command", ...);
  it("can modify block attrs via registered commands", ...);
});
```

**Why all five matter:** the four layers above the test correspond directly to acceptance criteria in `BUILD_BRIEF.md` (M1 schema, M2 renderer, M4 mapping). Skipping any layer means the corresponding milestone's acceptance test won't catch regressions in that block.

---

## 6. When you're done with a block

Before checking off a block as "complete":

- [ ] `src/blocks/<name>/schema.ts` and `src/blocks/<name>/index.tsx` exist.
- [ ] Block is registered in `loadAllBlocks()` (runtime-registry.ts) and `loadAllSchemas()` (schema-registry.ts).
- [ ] All five test layers pass.
- [ ] No hard-coded colors, fonts, or spacing in the renderer.
- [ ] No imports outside the project's allowed dependency list.
- [ ] An entry for the block exists in the editor's block palette.
- [ ] The block is exercised in `examples/sample-proposal.yaml` or `examples/sample-deck.yaml`.
- [ ] If the block is deck-applicable, it works inside the deck renderer's layout slots.

When all 15 blocks have passed this checklist, **M1 schema-level acceptance is satisfied**.

---

## 7. Anti-patterns to avoid

These are mistakes that the callout reference does NOT make — don't introduce them in the other 14 blocks:

| Anti-pattern | Why it's wrong | Do this instead |
|---|---|---|
| Defining the block's data shape in the React component | Couples data to UI; can't be tested separately | Schema in `<name>.ts`, type-imported by the component |
| Hard-coding `#0B3D91` in the renderer | Breaks per-consultancy brand customization | `resolveBrandToken(brand, "colors.brand.primary")` |
| Storing the variant-to-style mapping in CSS | Can't be SSR'd; breaks PDF export | Put it in TypeScript, return inline styles |
| Putting the editing UI inside the renderer | Production styling and editing UX conflict | Renderer = `<Name>.tsx` (pure); editor = `<Name>Node.tsx` |
| Using `dangerouslySetInnerHTML` for prose | Bypasses ProseMirror; opens XSS | Use `<ProseRenderer fragment={...} />` |
| Allowing free-text in cells (e.g., table.row.cell as `string`) | Drift between editor's rich text and on-wire data | Use `ProseMirrorFragmentSchema` for any rich-text field |
| Skipping `.strict()` on the schema | Unknown keys silently accepted; drift hidden | Always `.strict()` |
| Defining `crypto.randomUUID()` calls during render | Non-deterministic rendering breaks PDF + tests | IDs generated only at block creation, never during render |

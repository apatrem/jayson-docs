# Block Implementation Guide

**Purpose:** copy-pattern instructions for implementing the 15 pre-built blocks, using the reference callout block (`reference/callout/`) as the canonical example.

**Audience:** the developer (or LLM) implementing M1 blocks.

**Companion to:** `blocks.catalogue.yaml` (the spec for each block), `TYPES.md` (shared types), `reference/callout/` (the worked example).

---

## 1. The 4-file pattern (mandatory for every block)

Every block ships as exactly four files:

| File | Path in repo | Purpose |
|---|---|---|
| `<name>.ts` | `src/schema/blocks/` | Zod schema + TypeScript type + variant helpers |
| `<Name>.tsx` | `src/renderer/blocks/` | React renderer for HTML/PDF |
| `<Name>Node.tsx` | `src/editor/nodes/` | TipTap node + React node view + mapping helpers |
| `<name>.test.ts` | `tests/blocks/` | Five test layers (see §5) |

**No exceptions.** A block with three files is incomplete; a block with five files has misplaced responsibilities.

---

## 2. The implementation checklist (per block)

For each of the 14 remaining blocks, work in this order:

### Step 1 — Read the spec
- Open `blocks.catalogue.yaml`, find the entry for your block.
- Note the `schema` (data shape), `appliesTo` (document/deck), `brandTokensUsed`, `llmUsage.when`/`avoid`.

### Step 2 — Write `<name>.ts` (schema)
- Extend `BlockBaseSchema` (gives you `id`, `type`, `note`).
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
- If the block has variant-specific behavior (like callout's color tints), add a helper function in the same file.

### Step 3 — Add to the union
- Open `src/schema/blocks/index.ts`.
- Import your new schema.
- Add it to the `BlockSchema` discriminated union.

### Step 4 — Write `<Name>.tsx` (renderer)
- Component signature: `React.FC<{ block: XxxBlock }>`.
- Get brand tokens via `useBrandTokens()`.
- Resolve any tokens via `resolveBrandToken(brand, "colors.semantic.X")`.
- Build inline `style` objects from brand-derived values — never hard-code colors, fonts, or spacing.
- For rich-text fields, render via `<ProseRenderer fragment={block.body} />`.
- For asset paths starting with `$brand:`, resolve via `resolveAssetPath(brand, path)`.
- Set `data-block-id`, `data-block-type`, and any variant attributes on the root element.
- Use semantic HTML where applicable (`<aside>` for callouts, `<figure>` for images with captions, `<table>` for tables, etc.).

### Step 5 — Write `<Name>Node.tsx` (TipTap node + mapping)
- Define the Node via `Node.create({ name: "<block-id>", group: "block", ... })`.
- Add `attrs` for every scalar field in the schema (variant, title, src, etc.).
- For rich-text fields managed by the editor, use `content: "block+"` and a `<NodeViewContent />` slot.
- For purely structured fields (no rich text), set `content: ""` and render the editing UI entirely in the node view.
- Add `parseHTML` and `renderHTML` so copy/paste works.
- Add commands: at minimum `insert<Name>` and any block-specific actions (like callout's `setCalloutVariant`).
- Implement the React node view (use `ReactNodeViewRenderer`) — keep it minimal, focused on editing.
- Export `<name>BlockToProseMirror(block)` and `proseMirrorTo<Name>Block(node)` mapping helpers.

### Step 6 — Register in the editor
- Open `src/editor/Editor.tsx`.
- Import your new TipTap node.
- Add it to the editor's extensions array.

### Step 7 — Register the renderer
- Open `src/renderer/DocumentRenderer.tsx`.
- Add your component to the block-type-to-component dispatch (typically a `switch` on `block.type`).

### Step 8 — Add to the mapping
- Open `src/editor/mapping.ts`.
- Add a case in `blockToProseMirror(block)` that dispatches to your `<name>BlockToProseMirror`.
- Add a case in `proseMirrorToBlock(node)` that dispatches to your `proseMirrorTo<Name>Block`.

### Step 9 — Write the tests (`<name>.test.ts`)
- Five test layers per §5 below.

### Step 10 — Add a fixture entry to `examples/sample-proposal.yaml`
- If your block isn't yet exercised by the sample proposal, add a representative use of it.

### Step 11 — Add to the block palette
- Open `src/editor/BlockPalette.tsx` (or equivalent).
- Add an entry with the block's name, icon, and a one-line description (use `llmUsage.when` from the catalogue for the description).

**Estimated effort per block: 4–6 hours** for simple blocks (prose, heading, image), **8–12 hours** for complex blocks (chart, table, risk-matrix, roadmap).

---

## 3. Per-block notes (the harder ones)

Most blocks follow the callout pattern cleanly. These deserve specific attention:

### `chart` (block #5)
- The hardest block. Plan ≥ 12 hours.
- The renderer wraps ECharts. For the editor view, render a snapshot via `echarts-for-react`; for the PDF export, pre-render to static SVG via ECharts's headless mode (no JS at PDF time).
- The data grid (D-24 side panel) is a separate React component (`src/editor/panels/ChartDataPanel.tsx`) that mounts when a chart is selected.
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

- [ ] All four files exist at the production paths.
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

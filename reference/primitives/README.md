# Block primitives

The shared helpers every block renderer imports. **Foundation layer** — `reference/callout/` (and every other block) depends on these existing.

## Files

| File | Purpose | Production path |
|---|---|---|
| `BrandProvider.tsx` | React context wrapping brand tokens | `src/brand-tokens/BrandProvider.tsx` |
| `useBrandTokens.ts` | Hook to read brand tokens from any component | `src/brand-tokens/useBrandTokens.ts` |
| `resolve.ts` | `resolveBrandToken(brand, "colors.semantic.X")` — one-level alias resolution | `src/brand-tokens/resolve.ts` |
| `resolve-asset.ts` | `resolveAssetPath()` — turn `assets/x.jpg` or `$brand:logo.primary` into absolute paths | `src/brand-tokens/resolve-asset.ts` |
| `ProseRenderer.tsx` | ProseMirror JSON → HTML, no `dangerouslySetInnerHTML` | `src/renderer/ProseRenderer.tsx` |
| `block-primitives.ts` | `<Stack>`, `<Spacer>`, `<Caption>`, `<Overline>`, `<Card>` + re-exports | `src/block-primitives/index.ts` |

## Design rules these enforce

1. **No `dangerouslySetInnerHTML` anywhere in the codebase.** ProseRenderer composes real React elements. Any block using ProseRenderer inherits this property automatically. The setup-time code-gen lint (`SETUP_PIPELINE.md §4`) also forbids it.

2. **No hard-coded colors, fonts, or spacing in blocks.** Every block renderer is supposed to consume brand tokens via `useBrandTokens()` + `resolveBrandToken()`. The primitives demonstrate the pattern. Generated blocks (D-09) may import ONLY from this directory + react + tiptap + echarts — the lint enforces this.

3. **One-level aliasing for semantic tokens.** `colors.semantic.textPrimary` may point to `neutral.800`, but `neutral.800` is the final value (not another alias). Two-level chains would invite cycles; the `resolveBrandToken` implementation only follows one alias step.

4. **Asset paths are defense-in-depth-validated at render time.** Even though `AssetPathSchema` rejects `..` and absolute paths at the schema layer, `resolveAssetPath()` re-checks. This catches the case where a generated block somehow constructs a path at runtime.

5. **Closed set of ProseMirror node/mark types.** `ProseRenderer.tsx` has `ALLOWED_NODES` and `ALLOWED_MARKS` constants. Anything outside them is dropped silently. The TipTap editor schema should prevent these from appearing, but defense-in-depth.

## How blocks use these

A minimal block renderer pattern (matching `reference/callout/Callout.tsx`):

```tsx
import { useBrandTokens, resolveBrandToken, ProseRenderer } from "../../block-primitives";

export const MyBlock: React.FC<{ block: MyBlockType }> = ({ block }) => {
  const brand = useBrandTokens();
  const primary = resolveBrandToken(brand, "colors.brand.primary");

  return (
    <div data-block-id={block.id} data-block-type={block.type} style={{ color: primary }}>
      <ProseRenderer fragment={block.body} />
    </div>
  );
};
```

That's the entire surface. Anything more complex (variant tints, accent stripes, layouts) composes these primitives.

## What to test

- `BrandProvider` provides tokens; `useBrandTokens` throws outside it.
- `resolveBrandToken` resolves direct paths and one-level aliases; throws on unknown paths.
- `resolveAssetPath` accepts the two valid schemes, rejects `..`, rejects absolute paths.
- `ProseRenderer` renders allowed marks, drops disallowed ones, never produces `dangerouslySetInnerHTML`.
- All primitives (`Stack`, `Spacer`, `Caption`, `Overline`, `Card`) consume brand tokens (verified by rendering with a known-color brand context and asserting the color appears in the output HTML).

These tests belong in `tests/primitives/` and run alongside block tests (~30min of work per primitive).

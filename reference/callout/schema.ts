/**
 * Reference block #7 — Callout
 *
 * This is the canonical pattern for a structured block (vs. a prose block).
 * Each of the other 14 blocks follows this exact 4-file shape:
 *   - schema.ts        — Zod schema + TypeScript type
 *   - <Name>.tsx       — React renderer for HTML/PDF output
 *   - <Name>Node.tsx   — TipTap node view for the editor surface
 *   - <name>.test.ts   — Vitest tests (valid + invalid + render snapshot)
 *
 * Pattern notes for copy-adapt:
 *  - Always extend BlockBaseSchema (gives you `id`, `type`, `note`).
 *  - Use a literal type discriminator (`type: z.literal("callout")`) — this
 *    enables Zod's discriminatedUnion in the parent Block schema.
 *  - For rich-text fields, use ProseMirrorFragmentSchema.
 *  - For asset references, use AssetPathSchema (enforces the D-10 path rules).
 *  - Always `.strict()` the object — unknown keys must be rejected.
 *  - Never inline brand values (colors, fonts) — the renderer consumes them
 *    via the BrandTokens helper at render time.
 */

import { z } from "zod";
import { BlockBaseSchema } from "../../src/schema/blocks";              // adjust path per your tree
import { ProseMirrorFragmentSchema } from "../../src/schema/prosemirror-fragment";

/** Callout variants — map to brand.colors.status.* + a 'quote' + 'tip' variant. */
export const CalloutVariantSchema = z.enum([
  "info",
  "success",
  "warning",
  "error",
  "quote",
  "tip",
]);

export type CalloutVariant = z.infer<typeof CalloutVariantSchema>;

/**
 * Callout block schema.
 *
 * Refer to blocks.catalogue.yaml §7 for the spec this implements.
 *
 *   id          — inherited from BlockBaseSchema
 *   type        — literal "callout"
 *   variant     — visual treatment (info/success/warning/error/quote/tip)
 *   title       — optional, ≤100 chars
 *   body        — required ProseMirror fragment
 *   attribution — optional, only meaningful for variant="quote"
 *   note        — inherited from BlockBaseSchema, never rendered
 */
export const CalloutBlockSchema = BlockBaseSchema.extend({
  type: z.literal("callout"),
  variant: CalloutVariantSchema.default("info"),
  title: z.string().max(100).optional(),
  body: ProseMirrorFragmentSchema,
  attribution: z.string().max(200).optional(),
}).strict();

export type CalloutBlock = z.infer<typeof CalloutBlockSchema>;

/**
 * Helper: returns the brand-token name to use for the callout's background
 * tint, given a variant. The renderer resolves this name against the loaded
 * BrandTokens at render time.
 *
 * Keeping this in the schema module (not the renderer) ensures the variant ↔
 * token mapping is co-located with the variant definition — easier to keep
 * in sync.
 */
export function calloutTintTokenFor(variant: CalloutVariant): string {
  switch (variant) {
    case "info":    return "colors.status.info";
    case "success": return "colors.status.success";
    case "warning": return "colors.status.warning";
    case "error":   return "colors.status.error";
    case "quote":   return "colors.semantic.surfaceBackground";
    case "tip":     return "colors.brand.secondary";
  }
}

/**
 * Schema-registry entry for the pure (no-React/TipTap) layer.
 *
 * This object is imported by schema-registry.ts and must NOT transitively pull
 * in React, @tiptap/*, or src/renderer/ — enforced by schema-purity.test.ts.
 * Using z.ZodType<unknown> directly (zod is already a dep of this file) avoids
 * importing SchemaEntry from src/blocks/defineBlock which would drag in TipTap.
 */
export const schemaEntry = {
  schemaName: "callout",
  schema: CalloutBlockSchema,
  allowedAttrs: [
    "variant", "title", "body", "attribution", "note",
  ] as const,
  paletteLabel: "Callout",
} satisfies {
  schemaName: string;
  schema: z.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

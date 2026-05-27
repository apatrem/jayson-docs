/**
 * src/blocks/callout/schema.ts — self-contained schema for the Callout block.
 *
 * Source of truth for CalloutBlockSchema, CalloutBlock, CalloutVariant,
 * CalloutVariantSchema, and calloutTintTokenFor (T-145). Supersedes
 * src/schema/blocks/callout.ts which has been deleted; update any remaining
 * imports to use this module instead.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";
import { ProseMirrorFragmentSchema } from "../../schema/prosemirror-fragment";

export const CalloutVariantSchema = z.enum([
  "info",
  "success",
  "warning",
  "error",
  "quote",
  "tip",
]);

export type CalloutVariant = z.infer<typeof CalloutVariantSchema>;

export const CalloutBlockSchema = BlockBaseSchema.extend({
  type: z.literal("callout"),
  variant: CalloutVariantSchema.default("info"),
  title: z.string().max(100).optional(),
  body: ProseMirrorFragmentSchema,
  attribution: z.string().max(200).optional(),
}).strict();

export type CalloutBlock = z.infer<typeof CalloutBlockSchema>;

export function calloutTintTokenFor(variant: CalloutVariant): string {
  switch (variant) {
    case "info":
      return "colors.status.info";
    case "success":
      return "colors.status.success";
    case "warning":
      return "colors.status.warning";
    case "error":
      return "colors.status.error";
    case "quote":
      return "colors.semantic.surfaceBackground";
    case "tip":
      return "colors.brand.secondary";
  }
}

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "callout",
  schema: CalloutBlockSchema,
  allowedAttrs: ["variant", "title", "body", "attribution", "note"] as const,
  paletteLabel: "Callout",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

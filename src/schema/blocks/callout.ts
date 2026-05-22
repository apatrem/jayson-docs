import { z } from "zod";
import { BlockBaseSchema } from "./index";
import { ProseMirrorFragmentSchema } from "../prosemirror-fragment";

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

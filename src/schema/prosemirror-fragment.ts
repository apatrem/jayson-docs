import { z } from "zod";

/**
 * Rich-text content stored in ProseMirror JSON format. Used by:
 *   - prose blocks (body content)
 *   - bullet/numbered-list items (item text)
 *   - table cells
 *   - callout body
 *
 * The shape is ProseMirror's standard JSON serialization. We validate at the
 * structural level only; deeper validation happens via the TipTap schema.
 */
export const ProseMirrorFragmentSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.any()),
  })
  .passthrough();

export type ProseMirrorFragment = z.infer<typeof ProseMirrorFragmentSchema>;

import { z } from "zod";

/**
 * IDs are stable anchors for comments, patches, sections, slides, and blocks.
 * They are intentionally YAML-friendly: fixtures and LLM-generated drafts can
 * use readable kebab-case IDs, while the editor may generate UUIDv4 values.
 *
 * Document-level validation must additionally enforce uniqueness across all
 * section/slide IDs, block IDs, and comment IDs.
 */
export const StableIdSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, {
    message:
      "IDs must be stable strings using letters, numbers, underscores, or hyphens.",
  });

export type StableId = z.infer<typeof StableIdSchema>;

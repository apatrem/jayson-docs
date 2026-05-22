import { z } from "zod";

/**
 * Asset paths must be either:
 *   - relative within the doc folder, starting with "assets/" — e.g. "assets/cover.jpg"
 *   - a brand token reference, starting with "$brand:" — e.g. "$brand:logo.primary"
 *
 * Per D-10. Forbids absolute paths and parent-directory escapes.
 */
export const AssetPathSchema = z
  .string()
  .min(1)
  .refine((s) => !s.includes(".."), {
    message: "Asset paths must not contain '..' (parent-directory escape).",
  })
  .refine((s) => !s.startsWith("/"), {
    message: "Asset paths must not be absolute (must not start with '/').",
  })
  .refine((s) => !/^https?:\/\//i.test(s), {
    message: "Asset paths must not be HTTP URLs.",
  })
  .refine(
    (s) => s.startsWith("assets/") || s.startsWith("$brand:"),
    {
      message:
        "Asset paths must start with 'assets/' (per-doc) or '$brand:' (token).",
    },
  );

export type AssetPath = z.infer<typeof AssetPathSchema>;

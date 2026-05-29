import { z } from "zod";

/**
 * Heading-numbering formats (ADR-0018). Each outline level renders its counter
 * in one of these styles; a document's per-level list produces dotted prefixes
 * like "1.1.1" (all decimal) or "1.A.i" (decimal / upper-alpha / lower-roman).
 *
 * The number itself is always a *projection* — computed from heading order at
 * render time, never stored. These formats only pick how each level's counter
 * is rendered; the default house style lives in brand tokens, with an optional
 * per-document override in `meta.layout.numbering`.
 */
export const NumberFormatSchema = z.enum([
  "decimal", // 1, 2, 3
  "upper-alpha", // A, B, C
  "lower-alpha", // a, b, c
  "upper-roman", // I, II, III
  "lower-roman", // i, ii, iii
]);

export type NumberFormat = z.infer<typeof NumberFormatSchema>;

/** The four heading levels (1–4), so a level→format list is exactly 4 long. */
export const HEADING_LEVEL_COUNT = 4;

/** Default separator joining level counters in a dotted prefix ("1.1.1"). */
export const DEFAULT_NUMBERING_SEPARATOR = ".";

/** Default per-level formats when neither brand nor doc overrides them. */
export const DEFAULT_LEVEL_FORMATS: readonly NumberFormat[] = [
  "decimal",
  "decimal",
  "decimal",
  "decimal",
];

/**
 * The numbering house style as it appears in brand tokens: all four level
 * formats must be specified, separator optional (defaults to ".").
 */
export const BrandNumberingSchema = z
  .object({
    levelFormats: z.array(NumberFormatSchema).length(HEADING_LEVEL_COUNT),
    separator: z.string().min(1).max(3).default(DEFAULT_NUMBERING_SEPARATOR),
  })
  .strict();

export type BrandNumbering = z.infer<typeof BrandNumberingSchema>;

/**
 * A per-document numbering override (lives in `meta.layout.numbering`). Both
 * fields optional — a document may override just the separator, just the
 * formats, or both; anything absent falls back to the brand default, then the
 * built-in default.
 */
export const NumberingOverrideSchema = z
  .object({
    levelFormats: z.array(NumberFormatSchema).length(HEADING_LEVEL_COUNT).optional(),
    separator: z.string().min(1).max(3).optional(),
  })
  .strict();

export type NumberingOverride = z.infer<typeof NumberingOverrideSchema>;

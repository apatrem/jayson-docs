import { z } from "zod";
import { NumberingOverrideSchema } from "./numbering";

/**
 * Per-document layout overrides (ADR-0018). Optional, brand-relative, omitted
 * when at defaults. The only non-bibliographic data allowed in `meta`.
 *
 * `blockSpacing`: the inter-block gap as a multiple of `brand.spacing.unit`
 *   (brand default 3×). `numbering`: per-document heading-numbering override of
 *   the brand house style. Edited via the Document settings popup, never by hand.
 */
export const DocLayoutSchema = z
  .object({
    blockSpacing: z.number().min(0).max(40).optional(),
    numbering: NumberingOverrideSchema.optional(),
  })
  .strict();

export type DocLayout = z.infer<typeof DocLayoutSchema>;

/**
 * Document metadata. Populated by the scaffolding skill at creation; updated
 * by the editor on every save. Indexed by the library UI (D-27).
 */
export const MetaSchema = z
  .object({
    client: z.string().min(1).max(120),
    project: z.string().min(1).max(200),
    docKind: z.enum(["proposal", "report", "audit", "memo", "deck", "other"]),
    sector: z.string().optional(),
    tags: z.array(z.string()).default([]),
    language: z.enum(["en", "fr"]),
    status: z.enum(["draft", "in-review", "sent", "won", "lost", "archived"]),
    archived: z.boolean().default(false),
    confidentialityLevel: z.enum(["low", "medium", "high"]).default("medium"),
    owner: z.string().email(),
    reviewers: z.array(z.string().email()).default([]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    brandRef: z.string().default("$brand:default"),
    layout: DocLayoutSchema.optional(),
  })
  .strict();

export type Meta = z.infer<typeof MetaSchema>;

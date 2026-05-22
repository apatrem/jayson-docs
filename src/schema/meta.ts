import { z } from "zod";

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
  })
  .strict();

export type Meta = z.infer<typeof MetaSchema>;

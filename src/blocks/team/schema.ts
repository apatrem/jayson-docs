/**
 * src/blocks/team/schema.ts — self-contained schema for the Team block.
 *
 * Source of truth for TeamLayoutSchema, TeamLayout, TeamMemberSchema, TeamMember,
 * TeamBlockSchema, and TeamBlock (T-153). Supersedes
 * src/schema/blocks/team.ts which has been deleted.
 *
 * Pure module: no React, @tiptap/*, or src/renderer/ imports allowed.
 * Enforced by tests/blocks/schema-purity.test.ts.
 */

import { z } from "zod";
import type { z as zType } from "zod";
import { BlockBaseSchema } from "../../schema/blocks/block-base";
import { AssetPathSchema } from "../../schema/asset-path";

export const TeamLayoutSchema = z.enum(["grid", "hierarchical", "list"]);
export type TeamLayout = z.infer<typeof TeamLayoutSchema>;

export const TeamMemberSchema = z
  .object({
    name: z.string().min(1),
    role: z.string().min(1),
    photo: AssetPathSchema.optional(),
    allocation: z.string().optional(),
    bio: z.string().max(200).optional(),
  })
  .strict();

export type TeamMember = z.infer<typeof TeamMemberSchema>;

export const TeamBlockSchema = BlockBaseSchema.extend({
  type: z.literal("team"),
  layout: TeamLayoutSchema.default("grid"),
  members: z.array(TeamMemberSchema).min(1).max(12),
}).strict();

export type TeamBlock = z.infer<typeof TeamBlockSchema>;

/** Schema-registry entry — consumed by src/blocks/schema-registry.ts. */
export const schemaEntry = {
  schemaName: "team",
  schema: TeamBlockSchema,
  allowedAttrs: ["layout", "members", "note"] as const,
  paletteLabel: "Team",
} satisfies {
  schemaName: string;
  schema: zType.ZodType<unknown>;
  allowedAttrs: readonly string[];
  paletteLabel: string;
};

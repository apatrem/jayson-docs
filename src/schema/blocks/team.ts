import { z } from "zod";
import { AssetPathSchema } from "../asset-path";
import { BlockBaseSchema } from "./block-base";

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

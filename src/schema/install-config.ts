import { z } from "zod";

export const ProviderSchema = z.enum([
  "openai",
  "anthropic",
  "azure",
  "mistral",
  "openai-compatible",
  "local",
]);

export const RoleSchema = z.enum(["consultant", "senior", "admin"]);

export const EndpointSchema = z
  .object({
    provider: ProviderSchema,
    model: z.string().min(1),
    keychainEntry: z.string().min(1),
    baseUrl: z.string().url().optional(),
  })
  .strict();

export const InstallAppConfigSchema = z
  .object({
    user: z.object({
      name: z.string().min(1).max(80),
      email: z.string().email(),
      role: RoleSchema,
      initials: z.string().min(1).max(4),
    }),
    paths: z.object({
      cloudSyncRoot: z.string().min(1),
      sharedFolder: z.string().min(1),
    }),
    llm: z.object({
      fastModel: EndpointSchema,
      thinkingModel: EndpointSchema,
    }),
    costLimits: z.object({
      enabled: z.boolean(),
      monthlyUsdSoft: z.number().nonnegative(),
      monthlyUsdHard: z.number().nonnegative(),
      allowAdminOverride: z.boolean(),
    }),
    editor: z.object({
      reviewMode: z.enum(["panel", "inline", "diff"]),
      autosaveDebounceMs: z.number().int().positive(),
    }),
  })
  .strict();

export type InstallAppConfig = z.infer<typeof InstallAppConfigSchema>;

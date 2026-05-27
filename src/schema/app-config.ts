import { z } from "zod";

// D-101: GUI writes only the partial schema (paths.cloudSyncRoot).
// The full InstallAppConfigSchema (src/setup/install.ts) is a structural widen.
export const M8PartialConfigSchema = z
  .object({
    schemaVersion: z.string().optional(),
    paths: z
      .object({
        cloudSyncRoot: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type M8PartialConfig = z.infer<typeof M8PartialConfigSchema>;

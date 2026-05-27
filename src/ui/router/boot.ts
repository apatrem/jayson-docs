import { invoke } from "@tauri-apps/api/core";
import { isIpcError } from "../../ipc/errors";
import { M8PartialConfigSchema } from "../../schema/app-config";
import { InstallAppConfigSchema } from "../../schema/install-config";
import type { Route } from "./types";

export interface BootStrategy {
  bootRoute(): Promise<Route>;
}

function parseConfig(raw: unknown): { paths: { cloudSyncRoot: string } } | null {
  const m8 = M8PartialConfigSchema.safeParse(raw);
  if (m8.success) return m8.data;
  const full = InstallAppConfigSchema.safeParse(raw);
  if (full.success) return full.data;
  return null;
}

export function createIpcBootStrategy(): BootStrategy {
  return {
    async bootRoute(): Promise<Route> {
      let config: { paths: { cloudSyncRoot: string } } | null;
      try {
        const raw = await invoke<unknown>("read_app_config");
        config = parseConfig(raw);
      } catch (error) {
        if (isIpcError(error) && error.kind === "not-found") {
          return { kind: "folder-picker", reason: "first-launch" };
        }
        throw error;
      }
      if (config === null) {
        return { kind: "folder-picker", reason: "first-launch" };
      }

      const exists = await invoke<boolean>("file_exists", {
        path: config.paths.cloudSyncRoot,
      });
      if (!exists) {
        return { kind: "folder-picker", reason: "missing" };
      }

      return { kind: "library" };
    },
  };
}

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { BlockPaletteItem } from "../editor/BlockPalette";

export interface GeneratedBlocksContextValue {
  blocks: BlockPaletteItem[];
}

export const GeneratedBlocksContext = createContext<GeneratedBlocksContextValue>(
  { blocks: [] },
);

export function useGeneratedBlocks(): BlockPaletteItem[] {
  return useContext(GeneratedBlocksContext).blocks;
}

export interface GeneratedBlocksProviderProps {
  cloudSyncRoot: string;
  loadBlocks: (cloudSyncRoot: string) => Promise<BlockPaletteItem[]>;
  children: ReactNode;
}

export function GeneratedBlocksProvider({
  cloudSyncRoot,
  loadBlocks,
  children,
}: GeneratedBlocksProviderProps) {
  const [blocks, setBlocks] = useState<BlockPaletteItem[]>([]);

  useEffect(() => {
    loadBlocks(cloudSyncRoot)
      .then(setBlocks)
      .catch((e: unknown) => {
        console.error("Generated blocks load failed — palette degraded to defaults:", e);
      });
  }, [cloudSyncRoot, loadBlocks]);

  return (
    <GeneratedBlocksContext.Provider value={{ blocks }}>
      {children}
    </GeneratedBlocksContext.Provider>
  );
}

export async function loadGeneratedBlocksIpc(
  cloudSyncRoot: string,
): Promise<BlockPaletteItem[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  type IpcEntry = { name: string; path: string; is_dir: boolean };

  const activeDir = cloudSyncRoot.endsWith("/")
    ? `${cloudSyncRoot}generated-blocks/active`
    : `${cloudSyncRoot}/generated-blocks/active`;

  let entries: IpcEntry[];
  try {
    entries = await invoke<IpcEntry[]>("list_directory", { path: activeDir });
  } catch {
    return [];
  }

  const items: BlockPaletteItem[] = [];
  for (const entry of entries) {
    if (!entry.is_dir || entry.name.startsWith(".")) continue;
    const schemaPath = entry.path.endsWith("/")
      ? `${entry.path}schema.ts`
      : `${entry.path}/schema.ts`;
    const exists = await invoke<boolean>("file_exists", { path: schemaPath });
    if (!exists) continue;
    items.push({
      id: entry.name,
      name: toTitleCase(entry.name),
      when: "",
      command: `insertGenerated_${entry.name}`,
      generated: true,
    });
  }
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

function toTitleCase(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

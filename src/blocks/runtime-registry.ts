import { createContext, useContext } from "react";
import type { BlockRegistryRecord } from "./defineBlock";
import type { BlockPaletteItem } from "../editor/BlockPalette";
import bulletListBlock from "./bullet-list/index";
import calloutBlock from "./callout/index";
import chartBlock from "./chart/index";
import diagramBlock from "./diagram/index";
import dividerBlock from "./divider/index";
import headingBlock from "./heading/index";
import imageBlock from "./image/index";
import kpiCardsBlock from "./kpi-cards/index";
import numberedListBlock from "./numbered-list/index";
import proseBlock from "./prose/index";
import riskMatrixBlock from "./risk-matrix/index";
import roadmapBlock from "./roadmap/index";
import tableBlock from "./table/index";
import teamBlock from "./team/index";
import timelineBlock from "./timeline/index";

/**
 * Full runtime registry — editor and renderer wiring included.
 *
 * Populated at boot by loadAllBlocks().
 */
export const runtimeRegistry: readonly BlockRegistryRecord[] = [];

/**
 * Statically imports every Standard block's index.ts and returns all entries.
 *
 * Each block's index.ts wraps the legacy TipTap node, React renderer, and
 * mapping helpers into a defineBlock({...}) manifest. Dynamic folder-scan for
 * generated-blocks/active/ is stubbed (wired in M9b T-164).
 */
export function loadAllBlocks(): readonly BlockRegistryRecord[] {
  return [
    bulletListBlock,
    calloutBlock,
    chartBlock,
    diagramBlock,
    dividerBlock,
    headingBlock,
    imageBlock,
    kpiCardsBlock,
    numberedListBlock,
    proseBlock,
    riskMatrixBlock,
    roadmapBlock,
    tableBlock,
    teamBlock,
    timelineBlock,
    // T-164 (M9b): dynamic scan of generated-blocks/active/ wired here.
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Brand-block context  (T-141c)
//
// Provides generated/brand palette items to the editor palette.  Populated at
// app boot via loadBrandBlockPaletteItems(); injected in tests via
// App.loadGeneratedBlocks prop or GeneratedBlocksProvider wrapper.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * React context that holds the current list of brand-block palette items.
 * Wrap the app tree with BrandBlocksContext.Provider to populate it.
 */
export const BrandBlocksContext = createContext<BlockPaletteItem[]>([]);

/**
 * Hook for reading the current brand-block palette items from the registry
 * context.  Components that previously called useGeneratedBlocks() from
 * GeneratedBlocksContext should migrate to this hook.
 */
export function useBrandBlocksFromRegistry(): BlockPaletteItem[] {
  return useContext(BrandBlocksContext);
}

/**
 * Default async loader for generated blocks — scans generated-blocks/active/
 * via Tauri IPC and returns BlockPaletteItem descriptors for both:
 *
 * - **Brand blocks** (directories containing a `schema.ts` file) — id uses
 *   the directory name; command prefix is `insertGenerated_`.
 * - **Authored blocks** (single `.tsx` files, T-164) — id uses
 *   `authored:{slug}`; command prefix is `insertAuthored_`.
 *
 * Only `active/` Authored blocks are returned (archived blocks are excluded
 * from the palette).  Use {@link loadAuthoredBlockEntries} to get all
 * Authored blocks including archived ones (T-168, for the management view).
 *
 * Used as the default value of App.loadGeneratedBlocks prop.  Tests inject a
 * synchronous mock instead.
 */
export async function loadBrandBlockPaletteItems(
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
    if (entry.name.startsWith(".")) continue;

    if (entry.is_dir) {
      // Brand block — directory containing schema.ts
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
    } else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".manifest.json")) {
      // Authored block — single .tsx file installed by T-164 receive pipeline
      const slug = entry.name.slice(0, -4); // strip .tsx
      items.push({
        id: `authored:${slug}`,
        name: `${toTitleCase(slug)} (Authored)`,
        when: "",
        command: `insertAuthored_${slug}`,
        generated: true,
        folder: "active",
      });
    }
  }
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Scans both `generated-blocks/active/` and `generated-blocks/archived/` for
 * Authored `.tsx` files and returns all as BlockPaletteItems tagged with their
 * `folder` origin (T-168, ADR-0010).
 *
 * Used by the management view (T-169) to list and act on all Authored blocks,
 * including archived ones.  Brand block directories in `active/` are NOT
 * included — Brand blocks don't participate in the soft-archive lifecycle.
 *
 * Returns an empty array when neither directory exists (e.g., first launch).
 */
export async function loadAuthoredBlockEntries(
  cloudSyncRoot: string,
): Promise<BlockPaletteItem[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  type IpcEntry = { name: string; path: string; is_dir: boolean };

  const root = cloudSyncRoot.endsWith("/") ? cloudSyncRoot : `${cloudSyncRoot}/`;

  const results: BlockPaletteItem[] = [];

  for (const folderName of ["active", "archived"] as const) {
    const dirPath = `${root}generated-blocks/${folderName}`;
    let entries: IpcEntry[];
    try {
      entries = await invoke<IpcEntry[]>("list_directory", { path: dirPath });
    } catch {
      // Directory missing (e.g. archived/ doesn't exist yet) — skip quietly.
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.is_dir) continue;
      if (!entry.name.endsWith(".tsx") || entry.name.endsWith(".manifest.json")) continue;
      const slug = entry.name.slice(0, -4);
      results.push({
        id: `authored:${slug}`,
        name: `${toTitleCase(slug)} (Authored)`,
        when: "",
        command: `insertAuthored_${slug}`,
        generated: true,
        folder: folderName,
      });
    }
  }

  return results.sort((a, b) => a.id.localeCompare(b.id));
}

function toTitleCase(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

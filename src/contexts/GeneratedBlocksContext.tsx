/**
 * src/contexts/GeneratedBlocksContext.tsx — thin shim over runtime-registry (T-141c).
 *
 * The brand-block loading function (formerly loadGeneratedBlocksIpc) and the
 * BrandBlocksContext/hook have moved to src/blocks/runtime-registry.ts.  This
 * module is now a compatibility shim:
 *
 * - Re-exports useGeneratedBlocks → useBrandBlocksFromRegistry (same signature)
 * - Keeps GeneratedBlocksProvider for tests that wrap DocumentView with it
 *   (tests/ui/lifecycle/generated-blocks-load.test.tsx)
 *
 * New code should import from src/blocks/runtime-registry instead.
 */
import { useEffect, useState, type ReactNode } from "react";
import {
  BrandBlocksContext,
  useBrandBlocksFromRegistry,
} from "../blocks/runtime-registry";
import type { BlockPaletteItem } from "../editor/BlockPalette";

/** @deprecated — import useBrandBlocksFromRegistry from src/blocks/runtime-registry */
export { useBrandBlocksFromRegistry as useGeneratedBlocks };

export interface GeneratedBlocksProviderProps {
  cloudSyncRoot: string;
  loadBlocks: (cloudSyncRoot: string) => Promise<BlockPaletteItem[]>;
  children: ReactNode;
}

/**
 * Test-friendly provider: calls loadBlocks() and populates BrandBlocksContext.
 * Used by tests/ui/lifecycle/generated-blocks-load.test.tsx.
 */
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
        console.error(
          "Generated blocks load failed — palette degraded to defaults:",
          e,
        );
      });
  }, [cloudSyncRoot, loadBlocks]);

  return (
    <BrandBlocksContext.Provider value={blocks}>
      {children}
    </BrandBlocksContext.Provider>
  );
}

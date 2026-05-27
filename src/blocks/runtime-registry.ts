import type { BlockRegistryRecord } from "./defineBlock";

/**
 * Full runtime registry — editor and renderer wiring included.
 *
 * Populated by T-140 (static imports of each block's index.ts).
 * Empty until per-block folders are scaffolded in T-141.
 */
export const runtimeRegistry: readonly BlockRegistryRecord[] = [];

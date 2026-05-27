import type { SchemaEntry } from "./defineBlock";

/**
 * Pure schema registry — no React, TipTap, or renderer imports allowed.
 *
 * Populated by T-140 (static imports of each block's schema.ts).
 * Empty until per-block folders are scaffolded in T-141.
 */
export const schemaRegistry: readonly SchemaEntry[] = [];

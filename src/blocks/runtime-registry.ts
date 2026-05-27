import type { BlockRegistryRecord } from "./defineBlock";

/**
 * Full runtime registry — editor and renderer wiring included.
 *
 * Populated at boot by loadAllBlocks().
 * Empty until per-block folders are scaffolded in T-141.
 */
export const runtimeRegistry: readonly BlockRegistryRecord[] = [];

/**
 * Statically imports every Standard block's index.ts and returns all entries.
 *
 * Import lines below are stubs — each is uncommented in T-141 as the
 * corresponding src/blocks/<name>/index.ts file is created.
 *
 * Joins with schema-registry entries by schemaName at call time.
 * Dynamic folder-scan for generated-blocks/active/ is stubbed (wired in M9b T-164).
 *
 * Returns an empty array until T-141 scaffolds the per-block folders.
 */
export function loadAllBlocks(): readonly BlockRegistryRecord[] {
  const entries: BlockRegistryRecord[] = [
    // T-141: import calloutBlock from './callout/index';
    // T-141: import chartBlock from './chart/index';
    // T-141: import diagramBlock from './diagram/index';
    // T-141: import dividerBlock from './divider/index';
    // T-141: import headingBlock from './heading/index';
    // T-141: import imageBlock from './image/index';
    // T-141: import kpiCardsBlock from './kpi-cards/index';
    // T-141: import proseBlock from './prose/index';
    // T-141: import riskMatrixBlock from './risk-matrix/index';
    // T-141: import roadmapBlock from './roadmap/index';
    // T-141: import tableBlock from './table/index';
    // T-141: import teamBlock from './team/index';
    // T-141: import timelineBlock from './timeline/index';
    // T-141: import bulletListBlock from './bullet-list/index';
    // T-141: import numberedListBlock from './numbered-list/index';
    // T-164 (M9b): dynamic scan of generated-blocks/active/ wired here.
  ];
  return entries;
}

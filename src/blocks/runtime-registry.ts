import type { BlockRegistryRecord } from "./defineBlock";
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

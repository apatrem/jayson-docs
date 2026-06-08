/** Machine-readable layout spec derived from docs/setup/naming-table.md */

export type UsageTier = 'common' | 'less-common';

export type RegionKind =
  | 'title'
  | 'section-title'
  | 'subtitle'
  | 'chart-title'
  | 'content'
  | 'chart'
  | 'image'
  | 'source'
  | 'footer';

export interface ShapeGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ShapeMatch {
  /** Current PowerPoint cNvPr name before renaming */
  currentShapeName: string;
  /** Placeholder type (e.g. title, body, chart) or idx:N notation */
  placeholder?: string | undefined;
  /** Master placeholder default text */
  masterText?: string | undefined;
  /** Position/size in inches when recorded in the naming table */
  geometry?: ShapeGeometry | undefined;
}

export interface LayoutSlot {
  slotName: string;
  regionKind: RegionKind;
  chartKind?: string | undefined;
  match: ShapeMatch;
}

export interface LayoutSpecEntry {
  layoutId: string;
  tier: UsageTier;
  sourceSlideIndex: number;
  pinnedChartKind?: string | undefined;
  slots: LayoutSlot[];
}

export interface ShapeDeletion {
  sourceSlideIndex: number;
  match: ShapeMatch;
  reason?: string | undefined;
}

export interface LayoutSpec {
  templateId: 'report.master.pptx';
  layouts: LayoutSpecEntry[];
  deletions?: ShapeDeletion[] | undefined;
}

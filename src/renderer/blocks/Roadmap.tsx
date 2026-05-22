import type { CSSProperties, FC } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import {
  resolveBrandToken,
  resolveChartPalette,
} from "../../brand-tokens/resolve";
import type { BrandTokens } from "../../schema/brand";
import type {
  RoadmapBlock,
  RoadmapWorkstream,
} from "../../schema/blocks/roadmap";

export interface RoadmapProps {
  block: RoadmapBlock;
}

export function roadmapRangeDays(block: RoadmapBlock): number {
  const start = parseISO(block.startDate);
  const end = parseISO(block.endDate);
  return Math.max(1, differenceInCalendarDays(end, start));
}

export function workstreamOffsetPercent(
  block: RoadmapBlock,
  date: string,
): number {
  const total = roadmapRangeDays(block);
  const offset = differenceInCalendarDays(
    parseISO(date),
    parseISO(block.startDate),
  );
  return Math.min(100, Math.max(0, (offset / total) * 100));
}

export function workstreamWidthPercent(
  block: RoadmapBlock,
  workstream: RoadmapWorkstream,
): number {
  const total = roadmapRangeDays(block);
  const span = differenceInCalendarDays(
    parseISO(workstream.endDate),
    parseISO(workstream.startDate),
  );
  return Math.max(2, (span / total) * 100);
}

export function workstreamBarColor(
  brand: BrandTokens,
  workstream: RoadmapWorkstream,
  index: number,
): string {
  switch (workstream.color) {
    case "brand.primary":
      return resolveBrandToken(brand, "colors.brand.primary");
    case "brand.secondary":
      return resolveBrandToken(brand, "colors.brand.secondary");
    case "auto":
    default:
      return (
        resolveChartPalette(brand, "qualitative")[index] ??
        resolveBrandToken(brand, "colors.brand.primary")
      );
  }
}

export const Roadmap: FC<RoadmapProps> = ({ block }) => {
  const brand = useBrandTokens();
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  const trackHeight = brand.spacing.unit * 6;

  const containerStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    color: textPrimary,
    marginBottom: brand.spacing.unit * 3,
  };

  const axisStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    marginBottom: brand.spacing.unit,
  };

  const rowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: brand.spacing.unit * 2,
    alignItems: "center",
    marginBottom: brand.spacing.unit * 2,
  };

  const trackStyle: CSSProperties = {
    position: "relative",
    height: trackHeight,
    backgroundColor: resolveBrandToken(
      brand,
      "colors.semantic.surfaceBackground",
    ),
    border: `1px solid ${borderColor}`,
    borderRadius: 4,
  };

  const barStyle = (
    index: number,
    ws: RoadmapWorkstream,
  ): CSSProperties => ({
    position: "absolute",
    left: `${workstreamOffsetPercent(block, ws.startDate)}%`,
    width: `${workstreamWidthPercent(block, ws)}%`,
    top: brand.spacing.unit,
    height: trackHeight - brand.spacing.unit * 2,
    backgroundColor: workstreamBarColor(brand, ws, index),
    borderRadius: 3,
  });

  const milestoneStyle = (date: string): CSSProperties => ({
    position: "absolute",
    left: `${workstreamOffsetPercent(block, date)}%`,
    top: 0,
    transform: "translateX(-50%)",
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    whiteSpace: "nowrap",
  });

  return (
    <div
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="roadmap"
      data-time-unit={block.timeUnit}
      style={containerStyle}
    >
      <div style={axisStyle}>
        <span>{block.startDate}</span>
        <span>
          {roadmapRangeDays(block)} days · {block.timeUnit}
        </span>
        <span>{block.endDate}</span>
      </div>

      {block.workstreams.map((ws, index) => (
        <div key={index} style={rowStyle}>
          <div style={{ fontWeight: 600 }}>{ws.label}</div>
          <div style={trackStyle}>
            <div
              style={barStyle(index, ws)}
              title={`${ws.startDate} → ${ws.endDate}`}
            />
          </div>
        </div>
      ))}

      {block.milestones && block.milestones.length > 0 ? (
        <div style={{ ...rowStyle, marginTop: brand.spacing.unit }}>
          <div style={{ fontWeight: 600 }}>Milestones</div>
          <div
            style={{
              ...trackStyle,
              height: trackHeight + brand.spacing.unit * 4,
            }}
          >
            {block.milestones.map((milestone, index) => (
              <div
                key={index}
                style={milestoneStyle(milestone.date)}
                title={milestone.date}
              >
                ◆ {milestone.label}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

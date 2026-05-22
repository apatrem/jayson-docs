import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import type {
  TimelineBlock,
  TimelineConnector,
} from "../../schema/blocks/timeline";

export interface TimelineProps {
  block: TimelineBlock;
}

function connectorGlyph(connector: TimelineConnector): string {
  switch (connector) {
    case "arrow":
      return "→";
    case "line":
      return "—";
    case "none":
      return "";
  }
}

export const Timeline: FC<TimelineProps> = ({ block }) => {
  const brand = useBrandTokens();
  const isHorizontal = block.orientation === "horizontal";
  const accent = resolveBrandToken(brand, "colors.brand.primary");
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: isHorizontal ? "row" : "column",
    alignItems: isHorizontal ? "flex-start" : "stretch",
    gap: brand.spacing.unit * 2,
    fontFamily: brand.typography.fonts.body.family,
    marginBottom: brand.spacing.unit * 3,
  };

  const phaseStyle: CSSProperties = {
    flex: isHorizontal ? "1 1 0" : undefined,
    minWidth: isHorizontal ? 120 : undefined,
    padding: brand.spacing.unit * 2,
    borderLeft: isHorizontal ? undefined : `3px solid ${accent}`,
    borderTop: isHorizontal ? `3px solid ${accent}` : undefined,
  };

  const labelStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.bodyLg ?? brand.typography.scale.h4,
    fontWeight: 600,
    color: accent,
    margin: 0,
    marginBottom: brand.spacing.unit,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
    margin: 0,
    marginBottom: brand.spacing.unit / 2,
  };

  const bodyStyle: CSSProperties = {
    fontSize: brand.typography.scale.body,
    lineHeight: brand.typography.lineHeight.normal,
    color: textPrimary,
    margin: 0,
  };

  const connectorStyle: CSSProperties = {
    alignSelf: "center",
    color: borderColor,
    fontSize: brand.typography.scale.bodyLg ?? brand.typography.scale.body,
    padding: isHorizontal ? `0 ${brand.spacing.unit}px` : `${brand.spacing.unit}px 0`,
  };

  const glyph = connectorGlyph(block.connector);

  return (
    <div
      data-block-id={block.id}
      data-block-type="timeline"
      data-orientation={block.orientation}
      data-connector={block.connector}
      style={containerStyle}
      role="list"
    >
      {block.phases.map((phase, index) => (
        <div key={index} style={{ display: "flex", flexDirection: isHorizontal ? "row" : "column", flex: isHorizontal ? "1 1 0" : undefined, alignItems: isHorizontal ? "flex-start" : "stretch" }}>
          {index > 0 && glyph ? (
            <div style={connectorStyle} aria-hidden="true">
              {glyph}
            </div>
          ) : null}
          <article style={phaseStyle} role="listitem">
            <h4 style={labelStyle}>{phase.label}</h4>
            {phase.subtitle ? <p style={subtitleStyle}>{phase.subtitle}</p> : null}
            {phase.body ? <p style={bodyStyle}>{phase.body}</p> : null}
            {phase.duration ? (
              <p style={{ ...subtitleStyle, fontStyle: "italic" }}>{phase.duration}</p>
            ) : null}
          </article>
        </div>
      ))}
    </div>
  );
};

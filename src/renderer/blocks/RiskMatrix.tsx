import type { CSSProperties, FC } from "react";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import type { BrandTokens } from "../../schema/brand";
import {
  riskMatrixDimension,
  severityStatusToken,
  type RiskMatrixBlock,
  type RiskMatrixItem,
  type RiskSeverity,
} from "../../schema/blocks/risk-matrix";

export interface RiskMatrixProps {
  block: RiskMatrixBlock;
}

export function riskSeverityColor(
  brand: BrandTokens,
  severity: RiskSeverity,
): string {
  return resolveBrandToken(brand, severityStatusToken(severity));
}

export const RiskMatrix: FC<RiskMatrixProps> = ({ block }) => {
  const brand = useBrandTokens();
  const dimension = riskMatrixDimension(block.gridSize);
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  const surface = resolveBrandToken(brand, "colors.semantic.surfaceBackground");
  const onSeverity = resolveBrandToken(brand, "colors.neutral.0");
  const cellMinHeight = brand.spacing.unit * 12;
  const gap = brand.spacing.unit;

  const wrapperStyle: CSSProperties = {
    display: "flex",
    gap: brand.spacing.unit * 2,
    fontFamily: brand.typography.fonts.body.family,
    fontSize: brand.typography.scale.body,
    color: textPrimary,
    marginBottom: brand.spacing.unit * 3,
  };

  const yAxisStyle: CSSProperties = {
    writingMode: "vertical-rl",
    transform: "rotate(180deg)",
    fontSize: brand.typography.scale.caption,
    fontWeight: 600,
    color: textSecondary,
    alignSelf: "center",
  };

  const matrixColumnStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap,
    flex: 1,
  };

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${dimension}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${dimension}, minmax(${cellMinHeight}px, auto))`,
    gap,
  };

  const cellStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    flexWrap: "wrap",
    gap: brand.spacing.unit / 2,
    padding: brand.spacing.unit,
    border: `1px solid ${borderColor}`,
    backgroundColor: surface,
    borderRadius: brand.spacing.unit / 2,
    minHeight: cellMinHeight,
  };

  const riskStyle = (risk: RiskMatrixItem): CSSProperties => ({
    display: "inline-block",
    padding: `${brand.spacing.unit / 2}px ${brand.spacing.unit}px`,
    borderRadius: brand.spacing.unit / 2,
    fontSize: brand.typography.scale.caption,
    fontWeight: 600,
    color: onSeverity,
    backgroundColor: riskSeverityColor(brand, risk.severity),
    lineHeight: brand.typography.lineHeight.tight,
    wordBreak: "break-word",
  });

  const xAxisStyle: CSSProperties = {
    fontSize: brand.typography.scale.caption,
    fontWeight: 600,
    color: textSecondary,
    textAlign: "center",
    marginTop: brand.spacing.unit,
  };

  const rows: number[] = [];
  for (let y = dimension; y >= 1; y--) {
    rows.push(y);
  }

  return (
    <div
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="risk-matrix"
      data-grid-size={block.gridSize}
      style={wrapperStyle}
      role="img"
      aria-label={`${block.yAxisLabel} by ${block.xAxisLabel} risk matrix`}
    >
      <div style={yAxisStyle}>{block.yAxisLabel}</div>
      <div style={matrixColumnStyle}>
        <div style={gridStyle}>
          {rows.map((y) =>
            Array.from({ length: dimension }, (_, colIndex) => {
              const x = colIndex + 1;
              const cellRisks = block.risks.filter((r) => r.x === x && r.y === y);
              return (
                <div
                  key={`${x}-${y}`}
                  style={cellStyle}
                  data-cell-x={x}
                  data-cell-y={y}
                >
                  {cellRisks.map((risk, index) => (
                    <span key={index} style={riskStyle(risk)}>
                      {risk.label}
                    </span>
                  ))}
                </div>
              );
            }),
          )}
        </div>
        <div style={xAxisStyle}>{block.xAxisLabel}</div>
      </div>
    </div>
  );
};

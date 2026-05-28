/**
 * src/blocks/risk-matrix/index.tsx — full runtime manifest for the RiskMatrix block.
 *
 * T-152: migrates content from src/editor/nodes/RiskMatrixNode.tsx and
 * src/renderer/blocks/RiskMatrix.tsx into this single file.
 *
 * Named exports: RiskMatrixTipTapNode, riskMatrixBlockToProseMirror,
 *   proseMirrorToRiskMatrixBlock, RiskMatrix, RiskMatrixProps, riskSeverityColor
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type {
  RiskMatrixBlock,
  RiskMatrixGridSize,
  RiskMatrixItem,
  RiskSeverity,
} from "./schema";
import {
  RiskMatrixBlockDataSchema,
  defaultRiskMatrixItem,
  riskMatrixDimension,
  severityStatusToken,
} from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { ZodType } from "zod";
import type { CSSProperties, FC } from "react";

// ── Brand-token / renderer dependencies ──────────────────────────────────────
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";
import type { BrandTokens } from "../../schema/brand";

// ── Registry factory ─────────────────────────────────────────────────────────
import { defineBlock } from "../defineBlock";
import { RiskMatrixPanel } from "./RiskMatrixPanel";
import type { ProseMirrorNode } from "../../editor/mapping";

// ─────────────────────────────────────────────────────────────────────────────
// TipTap node
// ─────────────────────────────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentRiskMatrix: {
      insertRiskMatrix: (attrs?: Partial<RiskMatrixPayload>) => ReturnType;
    };
  }
}

type RiskMatrixPayload = {
  gridSize: RiskMatrixGridSize;
  xAxisLabel: string;
  yAxisLabel: string;
  risks: RiskMatrixItem[];
};

function defaultRiskMatrixPayload(): RiskMatrixPayload {
  return {
    gridSize: "3x3",
    xAxisLabel: "Likelihood",
    yAxisLabel: "Impact",
    risks: [defaultRiskMatrixItem("Sample risk", 2, 2, "medium")],
  };
}

function parsePayload(raw: string): RiskMatrixPayload {
  try {
    return JSON.parse(raw) as RiskMatrixPayload;
  } catch {
    return defaultRiskMatrixPayload();
  }
}

export const RiskMatrixTipTapNode = Node.create({
  name: "docRiskMatrix",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      payload: {
        default: "{}",
        parseHTML: (el) => el.getAttribute("data-payload") ?? "{}",
        renderHTML: (attrs: { payload: string }) => ({
          "data-payload": attrs.payload,
        }),
      },
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") ?? "",
        renderHTML: (attrs: { note: string }) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block-type="risk-matrix"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "risk-matrix" }),
    ];
  },

  addCommands() {
    return {
      insertRiskMatrix:
        (attrs: Partial<RiskMatrixPayload> = {}) =>
        ({ commands }) => {
          const base = defaultRiskMatrixPayload();
          const payload: RiskMatrixPayload = {
            gridSize: attrs.gridSize ?? base.gridSize,
            xAxisLabel: attrs.xAxisLabel ?? base.xAxisLabel,
            yAxisLabel: attrs.yAxisLabel ?? base.yAxisLabel,
            risks: attrs.risks ?? base.risks,
          };
          return commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              payload: JSON.stringify(payload),
              note: "",
            },
          });
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(RiskMatrixNodeView);
  },
});

const RiskMatrixNodeView: FC<NodeViewProps> = ({ node, selected }) => {
  const blockId = String(node.attrs.blockId);
  const payload = parsePayload(node.attrs.payload as string);
  const block: RiskMatrixBlock = {
    id: blockId,
    type: "risk-matrix",
    gridSize: payload.gridSize,
    xAxisLabel: payload.xAxisLabel,
    yAxisLabel: payload.yAxisLabel,
    risks: payload.risks,
  };

  return (
    <NodeViewWrapper
      className="risk-matrix-node-view"
      data-block-id={blockId}
      contentEditable={false}
      style={editorBlockStyle(selected)}
    >
      <RiskMatrix block={block} />
    </NodeViewWrapper>
  );
};

function editorBlockStyle(selected: boolean): CSSProperties {
  return {
    outline: selected ? "2px solid var(--brand-primary, #0B3D91)" : "none",
    outlineOffset: 4,
    cursor: "pointer",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type RiskMatrixPmNode = {
  attrs: {
    blockId: string;
    payload: string;
    note: string;
  };
};

export function riskMatrixBlockToProseMirror(block: RiskMatrixBlock): {
  type: string;
  attrs: RiskMatrixPmNode["attrs"];
} {
  const payload: RiskMatrixPayload = {
    gridSize: block.gridSize,
    xAxisLabel: block.xAxisLabel,
    yAxisLabel: block.yAxisLabel,
    risks: block.risks,
  };
  return {
    type: "docRiskMatrix",
    attrs: {
      blockId: block.id,
      payload: JSON.stringify(payload),
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToRiskMatrixBlock(
  node: RiskMatrixPmNode,
): RiskMatrixBlock {
  const payload = parsePayload(node.attrs.payload);
  return {
    id: node.attrs.blockId,
    type: "risk-matrix",
    gridSize: payload.gridSize,
    xAxisLabel: payload.xAxisLabel,
    yAxisLabel: payload.yAxisLabel,
    risks: payload.risks,
    note: node.attrs.note || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const riskMatrixBlock = defineBlock<RiskMatrixBlock>({
  schemaName: "risk-matrix",
  schema: RiskMatrixBlockDataSchema as ZodType<RiskMatrixBlock>,
  allowedAttrs: ["gridSize", "xAxisLabel", "yAxisLabel", "risks", "note"] as const,
  paletteLabel: "Risk Matrix",
  tiptapNode: RiskMatrixTipTapNode,
  renderer: RiskMatrix,
  toPm: (block) => riskMatrixBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToRiskMatrixBlock(node as unknown as RiskMatrixPmNode),
  panel: RiskMatrixPanel,
});

export default riskMatrixBlock;

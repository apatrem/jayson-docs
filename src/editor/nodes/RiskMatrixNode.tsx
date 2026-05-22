import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { FC } from "react";
import {
  defaultRiskMatrixItem,
  type RiskMatrixBlock,
  type RiskMatrixGridSize,
  type RiskMatrixItem,
} from "../../schema/blocks/risk-matrix";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    riskMatrix: {
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
        (attrs = {}) =>
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

const RiskMatrixNodeView: FC<NodeViewProps> = ({ node }) => {
  const payload = parsePayload(node.attrs.payload as string);
  return (
    <NodeViewWrapper className="risk-matrix-node-view">
      <span>
        Risk matrix ({payload.gridSize}, {payload.risks.length} risks)
      </span>
    </NodeViewWrapper>
  );
};

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

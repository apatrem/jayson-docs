import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  RiskMatrixTipTapNode,
  riskMatrixBlockToProseMirror,
  proseMirrorToRiskMatrixBlock,
  RiskMatrix,
  riskSeverityColor,
} from "../../src/blocks/risk-matrix";
import {
  RiskMatrixBlockSchema,
  type RiskMatrixBlock,
} from "../../src/blocks/risk-matrix/schema";
import type { BrandTokens } from "../../src/schema/brand";

const validRiskMatrix: RiskMatrixBlock = {
  id: "b4-risk-01",
  type: "risk-matrix",
  gridSize: "3x3",
  xAxisLabel: "Likelihood",
  yAxisLabel: "Impact",
  risks: [
    { label: "Licensing delay", x: 2, y: 3, severity: "high" },
    { label: "Vendor concentration", x: 3, y: 2, severity: "medium" },
    { label: "Stakeholder alignment", x: 1, y: 1, severity: "low" },
  ],
};

const testBrandTokens = {
  schemaVersion: "1.0.0",
  lastUpdated: "2026-05-21",
  identity: { name: "Test" },
  logo: { primary: { svg: "logo.svg", minWidthPx: 80, intrinsicAspect: 3.2 } },
  colors: {
    brand: {
      primary: "#0B3D91",
      secondary: "#E8A33D",
      dark: "#0A1A2F",
      light: "#F4F7FC",
    },
    neutral: {
      "0": "#FFFFFF",
      "200": "#E2E8F0",
      "600": "#475569",
      "800": "#1E293B",
    },
    semantic: {
      surfaceBackground: "neutral.200",
      border: "neutral.200",
      textPrimary: "neutral.800",
      textSecondary: "neutral.600",
      link: "brand.primary",
      headingPrimary: "brand.dark",
      accent: "brand.secondary",
    },
    status: {
      info: "#1D4ED8",
      success: "#15803D",
      warning: "#B45309",
      error: "#B91C1C",
    },
    chartPalette: {
      qualitative: [
        "#0B3D91",
        "#E8A33D",
        "#2D9C5A",
        "#C44536",
        "#7C3AED",
        "#0891B2",
        "#65A30D",
        "#DB2777",
      ],
      sequential: ["#F4F7FC", "#7FA3DC", "#0B3D91"],
    },
  },
  typography: {
    fonts: {
      heading: { family: "Heading", source: "system" as const, weights: [600] },
      body: { family: "Body", source: "system" as const, weights: [400] },
      mono: { family: "Mono", source: "system" as const, weights: [400] },
    },
    scale: {
      body: 11,
      bodyLg: 13,
      caption: 9,
      h1: 32,
      h2: 24,
      h3: 20,
      h4: 16,
    },
    lineHeight: { tight: 1.15, normal: 1.5 },
  },
  spacing: { unit: 4, scale: [0, 1, 2, 3, 4, 6, 8] },
  page: {
    size: "A4" as const,
    orientation: "portrait" as const,
    margins: { top: 24, right: 18, bottom: 22, left: 18 },
  },
  deck: {
    slideSize: "16:9" as const,
    dimensionsPx: { width: 1920, height: 1080 },
    margins: { top: 72, right: 96, bottom: 72, left: 96 },
  },
  elements: {},
  charts: {},
} satisfies BrandTokens;

describe("RiskMatrixBlockSchema — valid fixtures", () => {
  it("accepts a 3x3 matrix with multiple risks", () => {
    expect(RiskMatrixBlockSchema.parse(validRiskMatrix)).toEqual(validRiskMatrix);
  });

  it("accepts a 2x2 matrix within coordinate bounds", () => {
    const block = RiskMatrixBlockSchema.parse({
      id: "b4-risk-02",
      type: "risk-matrix",
      gridSize: "2x2",
      risks: [{ label: "Supply chain", x: 2, y: 2, severity: "critical" }],
    });
    expect(block.gridSize).toBe("2x2");
    expect(block.xAxisLabel).toBe("Likelihood");
  });

  it("applies grid and axis label defaults", () => {
    const parsed = RiskMatrixBlockSchema.parse({
      id: "b4-risk-03",
      type: "risk-matrix",
      risks: [{ label: "Regulatory", x: 1, y: 1, severity: "low" }],
    });
    expect(parsed.gridSize).toBe("3x3");
    expect(parsed.yAxisLabel).toBe("Impact");
  });
});

describe("RiskMatrixBlockSchema — invalid fixtures", () => {
  it("rejects coordinates outside a 2x2 grid", () => {
    const result = RiskMatrixBlockSchema.safeParse({
      id: "b4-risk-bad",
      type: "risk-matrix",
      gridSize: "2x2",
      risks: [{ label: "Out of bounds", x: 3, y: 1, severity: "high" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join(".") === "risks.0.x")).toBe(
        true,
      );
    }
  });

  it("rejects an unknown severity", () => {
    expect(
      RiskMatrixBlockSchema.safeParse({
        ...validRiskMatrix,
        risks: [{ label: "Bad", x: 1, y: 1, severity: "extreme" }],
      }).success,
    ).toBe(false);
  });

  it("rejects empty risks array", () => {
    expect(
      RiskMatrixBlockSchema.safeParse({ ...validRiskMatrix, risks: [] }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      RiskMatrixBlockSchema.safeParse({ ...validRiskMatrix, extra: true }).success,
    ).toBe(false);
  });
});

describe("RiskMatrix renderer", () => {
  const renderWithBrand = (block: RiskMatrixBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(RiskMatrix, { block }),
      ),
    );

  it("renders root element with block metadata", () => {
    const html = renderWithBrand(validRiskMatrix);
    expect(html).toContain('data-block-type="risk-matrix"');
    expect(html).toContain(`data-block-id="${validRiskMatrix.id}"`);
    expect(html).toContain('data-grid-size="3x3"');
  });

  it("renders risk labels and axis labels", () => {
    const html = renderWithBrand(validRiskMatrix);
    expect(html).toContain("Licensing delay");
    expect(html).toContain("Likelihood");
    expect(html).toContain("Impact");
  });

  it("uses brand status colors for severity (not hard-coded unrelated values)", () => {
    const { success, error } = testBrandTokens.colors.status;
    expect(riskSeverityColor(testBrandTokens, "low")).toBe(success);
    const html = renderWithBrand(validRiskMatrix);
    expect(html).toContain(error);
    expect(html).toContain(success);
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validRiskMatrix)).toBe(renderWithBrand(validRiskMatrix));
  });
});

describe("RiskMatrix mapping", () => {
  it("round-trips losslessly", () => {
    const pm = riskMatrixBlockToProseMirror(validRiskMatrix);
    expect(proseMirrorToRiskMatrixBlock(pm)).toEqual(validRiskMatrix);
  });
});

describe("RiskMatrix TipTap node", () => {
  it("registers insertRiskMatrix command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, RiskMatrixTipTapNode],
    });
    editor.commands.insertRiskMatrix();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"docRiskMatrix"');
    editor.destroy();
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import type { AssetContext } from "../../src/brand-tokens/resolve-asset";
import {
  TeamTipTapNode,
  teamBlockToProseMirror,
  proseMirrorToTeamBlock,
} from "../../src/editor/nodes/TeamNode";
import { Team } from "../../src/renderer/blocks/Team";
import { TeamBlockSchema, type TeamBlock } from "../../src/schema/blocks/team";
import type { BrandTokens } from "../../src/schema/brand";

const validTeam: TeamBlock = {
  id: "b4-team-01",
  type: "team",
  layout: "grid",
  members: [
    {
      name: "Jane Smith",
      role: "Engagement lead",
      photo: "assets/jane.jpg",
      allocation: "30%",
      bio: "15 years in industrial decarbonization.",
    },
    {
      name: "Pierre Dubois",
      role: "Senior advisor",
      allocation: "20%",
    },
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

const assetContext: AssetContext = {
  sharedFolderPath: "/shared",
  docFolderPath: "/docs/proposal",
  brand: testBrandTokens,
};

describe("TeamBlockSchema — valid fixtures", () => {
  it("accepts a grid team block from sample-proposal shape", () => {
    expect(TeamBlockSchema.parse(validTeam)).toEqual(validTeam);
  });

  it("accepts list and hierarchical layouts", () => {
    expect(
      TeamBlockSchema.parse({ ...validTeam, layout: "list" }).layout,
    ).toBe("list");
    expect(
      TeamBlockSchema.parse({ ...validTeam, layout: "hierarchical" }).layout,
    ).toBe("hierarchical");
  });

  it("applies grid layout default", () => {
    const { layout: _l, ...withoutLayout } = validTeam;
    expect(TeamBlockSchema.parse(withoutLayout).layout).toBe("grid");
  });
});

describe("TeamBlockSchema — invalid fixtures", () => {
  it("rejects empty members", () => {
    expect(
      TeamBlockSchema.safeParse({ ...validTeam, members: [] }).success,
    ).toBe(false);
  });

  it("rejects bio longer than 200 chars", () => {
    expect(
      TeamBlockSchema.safeParse({
        ...validTeam,
        members: [{ name: "A", role: "B", bio: "x".repeat(201) }],
      }).success,
    ).toBe(false);
  });

  it("rejects asset path traversal in photo", () => {
    expect(
      TeamBlockSchema.safeParse({
        ...validTeam,
        members: [{ name: "A", role: "B", photo: "assets/../secret.jpg" }],
      }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      TeamBlockSchema.safeParse({ ...validTeam, extra: true }).success,
    ).toBe(false);
  });
});

describe("Team renderer", () => {
  const renderWithBrand = (block: TeamBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(Team, { block, assetContext }),
      ),
    );

  it("renders section with block metadata", () => {
    const html = renderWithBrand(validTeam);
    expect(html).toContain('data-block-type="team"');
    expect(html).toContain(`data-block-id="${validTeam.id}"`);
    expect(html).toContain('data-layout="grid"');
  });

  it("renders member names and resolved photo path", () => {
    const html = renderWithBrand(validTeam);
    expect(html).toContain("Jane Smith");
    expect(html).toContain("/docs/proposal/assets/jane.jpg");
    expect(html).toContain("PD");
  });

  it("renders list layout distinctly", () => {
    const html = renderWithBrand({ ...validTeam, layout: "list" });
    expect(html).toContain('data-layout="list"');
  });

  it("uses brand primary for avatar fallback", () => {
    const html = renderWithBrand(validTeam);
    expect(html).toContain(testBrandTokens.colors.brand.primary);
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validTeam)).toBe(renderWithBrand(validTeam));
  });
});

describe("Team mapping", () => {
  it("round-trips losslessly", () => {
    const pm = teamBlockToProseMirror(validTeam);
    expect(proseMirrorToTeamBlock(pm)).toEqual(validTeam);
  });
});

describe("Team TipTap node", () => {
  it("registers insertTeam command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, TeamTipTapNode],
    });
    editor.commands.insertTeam();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"docTeam"');
    editor.destroy();
  });
});

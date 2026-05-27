import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import type { AssetContext } from "../../src/brand-tokens/resolve-asset";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  ImageTipTapNode,
  imageBlockToProseMirror,
  proseMirrorToImageBlock,
  Image,
} from "../../src/blocks/image";
import {
  ImageBlockSchema,
  type ImageBlock,
} from "../../src/blocks/image/schema";
import type { BrandTokens } from "../../src/schema/brand";

const testBrandTokens = {
  schemaVersion: "1.0.0",
  lastUpdated: "2026-05-21",
  identity: { name: "Test" },
  logo: {
    primary: {
      svg: "assets/logo/primary.svg",
      minWidthPx: 80,
      intrinsicAspect: 3.2,
    },
  },
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
      sequential: ["#F4F7FC", "#C9D7EF", "#7FA3DC", "#3870C0", "#0B3D91"],
    },
  },
  typography: {
    fonts: {
      heading: { family: "Heading", source: "system" as const, weights: [600] },
      body: { family: "Body", source: "system" as const, weights: [400] },
      mono: { family: "Mono", source: "system" as const, weights: [400] },
    },
    scale: { h1: 32, h2: 24, h3: 20, h4: 16, body: 11, caption: 9 },
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

const validDocImage: ImageBlock = {
  id: "b4-image-01",
  type: "image",
  src: "assets/team-meeting.jpg",
  alt: "Team reviewing site plans at a whiteboard.",
  caption: "Kickoff workshop, May 2026.",
  width: "large",
  align: "center",
};

const validBrandImage: ImageBlock = {
  id: "b4-image-02",
  type: "image",
  src: "$brand:logo.primary",
  alt: "Company logo",
  width: "small",
  align: "left",
};

describe("ImageBlockSchema — valid fixtures", () => {
  it("accepts a doc-relative assets/ path", () => {
    expect(ImageBlockSchema.parse(validDocImage)).toEqual(validDocImage);
  });

  it("accepts a $brand: token path", () => {
    expect(ImageBlockSchema.parse(validBrandImage)).toEqual(validBrandImage);
  });

  it("applies width and align defaults", () => {
    const parsed = ImageBlockSchema.parse({
      id: "b4-image-03",
      type: "image",
      src: "assets/photo.jpg",
      alt: "Photo",
    });
    expect(parsed.width).toBe("medium");
    expect(parsed.align).toBe("center");
  });
});

describe("ImageBlockSchema — invalid fixtures", () => {
  it("rejects parent-directory traversal in src", () => {
    expect(
      ImageBlockSchema.safeParse({
        ...validDocImage,
        src: "../other/assets/leaked.jpg",
      }).success,
    ).toBe(false);
  });

  it("rejects HTTP URLs", () => {
    expect(
      ImageBlockSchema.safeParse({
        ...validDocImage,
        src: "https://example.com/x.jpg",
      }).success,
    ).toBe(false);
  });

  it("rejects missing alt", () => {
    expect(
      ImageBlockSchema.safeParse({ ...validDocImage, alt: "" }).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(
      ImageBlockSchema.safeParse({ ...validDocImage, extra: true }).success,
    ).toBe(false);
  });
});

describe("Image renderer", () => {
  const renderWithBrand = (block: ImageBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(Image, { block, assetContext }),
      ),
    );

  it("renders figure with resolved doc asset path", () => {
    const html = renderWithBrand(validDocImage);
    expect(html).toContain('data-block-type="image"');
    expect(html).toContain("/docs/proposal/assets/team-meeting.jpg");
    expect(html).toContain("Team reviewing site plans");
    expect(html).toContain("Kickoff workshop");
  });

  it("resolves $brand: logo paths via shared folder", () => {
    const html = renderWithBrand(validBrandImage);
    expect(html).toContain("/shared/assets/logo/primary.svg");
  });

  it("is deterministic", () => {
    expect(renderWithBrand(validDocImage)).toBe(renderWithBrand(validDocImage));
  });
});

describe("Image mapping", () => {
  it("round-trips losslessly", () => {
    const pm = imageBlockToProseMirror(validDocImage);
    expect(proseMirrorToImageBlock(pm)).toEqual(validDocImage);
  });
});

describe("Image TipTap node", () => {
  it("registers insertImage command", () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text, ImageTipTapNode],
    });
    editor.commands.insertImage({
      src: "assets/photo.jpg",
      alt: "Workshop photo",
    });
    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain('"type":"image"');
    expect(json).toContain("assets/photo.jpg");
    editor.destroy();
  });
});

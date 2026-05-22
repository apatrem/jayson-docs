import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  CalloutTipTapNode,
  calloutBlockToProseMirror,
  proseMirrorToCalloutBlock,
} from "../../src/editor/nodes/CalloutNode";
import { Callout } from "../../src/renderer/blocks/Callout";
import {
  CalloutBlockSchema,
  calloutTintTokenFor,
  type CalloutBlock,
} from "../../src/schema/blocks/callout";
import type { BrandTokens } from "../../src/schema/brand";

const validInfoCallout: CalloutBlock = {
  id: "11111111-1111-1111-1111-111111111111",
  type: "callout",
  variant: "info",
  title: "Why now",
  body: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "EU tax credits expire Q4 2027." }],
      },
    ],
  },
};

const validQuoteCallout: CalloutBlock = {
  id: "22222222-2222-2222-2222-222222222222",
  type: "callout",
  variant: "quote",
  body: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "We have nine months." }],
      },
    ],
  },
  attribution: "CFO, board meeting May 2026",
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
      heading: { family: "Inter", source: "system" as const, weights: [600] },
      body: { family: "Inter", source: "system" as const, weights: [400] },
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
  spacing: { unit: 4, scale: [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48] },
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

const editorExtensions = [
  Document,
  Paragraph,
  Text,
  CalloutTipTapNode,
];

describe("CalloutBlockSchema — valid fixtures", () => {
  it("accepts an 'info' callout with title and body", () => {
    expect(CalloutBlockSchema.safeParse(validInfoCallout).success).toBe(true);
  });

  it("accepts a 'quote' callout with attribution", () => {
    expect(CalloutBlockSchema.safeParse(validQuoteCallout).success).toBe(true);
  });

  it("applies the default variant when omitted", () => {
    const { variant: _v, ...withoutVariant } = validInfoCallout;
    expect(CalloutBlockSchema.parse(withoutVariant).variant).toBe("info");
  });
});

describe("CalloutBlockSchema — invalid fixtures", () => {
  it("rejects an unknown variant", () => {
    const result = CalloutBlockSchema.safeParse({
      ...validInfoCallout,
      variant: "celebration",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("variant");
    }
  });

  it("rejects a title longer than 100 chars", () => {
    expect(
      CalloutBlockSchema.safeParse({
        ...validInfoCallout,
        title: "x".repeat(101),
      }).success,
    ).toBe(false);
  });

  it("rejects a missing body", () => {
    const { body: _b, ...withoutBody } = validInfoCallout;
    expect(CalloutBlockSchema.safeParse(withoutBody).success).toBe(false);
  });

  it("rejects unknown keys (strict mode)", () => {
    expect(
      CalloutBlockSchema.safeParse({
        ...validInfoCallout,
        extraField: "should not be allowed",
      }).success,
    ).toBe(false);
  });
});

describe("Callout renderer", () => {
  const renderWithBrand = (block: CalloutBlock) =>
    renderToStaticMarkup(
      createElement(
        BrandProvider,
        { tokens: testBrandTokens },
        createElement(Callout, { block }),
      ),
    );

  it("renders an aside element with the block id and variant", () => {
    const html = renderWithBrand(validInfoCallout);
    expect(html).toContain("<aside");
    expect(html).toContain(`data-block-id="${validInfoCallout.id}"`);
    expect(html).toContain('data-variant="info"');
  });

  it("renders the title when present", () => {
    expect(renderWithBrand(validInfoCallout)).toContain("Why now");
  });

  it("omits the title element when title is absent", () => {
    expect(
      renderWithBrand({ ...validInfoCallout, title: undefined }),
    ).not.toContain("Why now");
  });

  it("renders the attribution only for 'quote' variant", () => {
    expect(renderWithBrand(validQuoteCallout)).toContain(
      "CFO, board meeting May 2026",
    );
    expect(
      renderWithBrand({
        ...validInfoCallout,
        attribution: "Should not appear",
      }),
    ).not.toContain("Should not appear");
  });

  it("uses the variant tint color from brand tokens (not a hard-coded value)", () => {
    const html = renderWithBrand({ ...validInfoCallout, variant: "warning" });
    expect(html).toContain(testBrandTokens.colors.status.warning);
    expect(html).not.toContain(testBrandTokens.colors.status.success);
  });

  it("is deterministic (same input -> same output)", () => {
    const first = renderWithBrand(validInfoCallout);
    const second = renderWithBrand(validInfoCallout);
    expect(first).toBe(second);
  });
});

describe("Callout mapping (DocModel <-> ProseMirror)", () => {
  it("round-trips an info callout losslessly", () => {
    const pm = calloutBlockToProseMirror(validInfoCallout);
    expect(proseMirrorToCalloutBlock(pm)).toEqual(validInfoCallout);
  });

  it("round-trips a quote callout with attribution losslessly", () => {
    const pm = calloutBlockToProseMirror(validQuoteCallout);
    expect(proseMirrorToCalloutBlock(pm)).toEqual(validQuoteCallout);
  });
});

describe("Callout TipTap node", () => {
  it("registers an `insertCallout` command", () => {
    const editor = new Editor({ extensions: editorExtensions });
    const before = JSON.stringify(editor.getJSON());
    expect(before).not.toContain('"type":"callout"');

    editor.commands.insertCallout({ variant: "warning", title: "Heads up" });

    const after = JSON.stringify(editor.getJSON());
    expect(after).toContain('"type":"callout"');
    expect(after).toContain('"variant":"warning"');
    expect(after).toContain('"title":"Heads up"');
    editor.destroy();
  });

  it("can change variant via setCalloutVariant", () => {
    const editor = new Editor({ extensions: editorExtensions });
    editor.commands.insertCallout({ variant: "info" });
    editor.commands.setCalloutVariant("success");

    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain('"variant":"success"');
    expect(json).not.toContain('"variant":"info"');
    editor.destroy();
  });
});

describe("calloutTintTokenFor", () => {
  const variants = [
    "info",
    "success",
    "warning",
    "error",
    "quote",
    "tip",
  ] as const;

  it.each(variants)("returns a non-empty token reference for variant '%s'", (v) => {
    const token = calloutTintTokenFor(v);
    expect(token.length).toBeGreaterThan(0);
    expect(token).toMatch(/^colors\./);
  });
});

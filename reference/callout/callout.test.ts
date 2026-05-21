/**
 * Reference block #7 — Callout tests.
 *
 * Test layers (every block must have all five):
 *  1. Schema — valid fixtures parse.
 *  2. Schema — invalid fixtures fail with the documented error path.
 *  3. Renderer — produces non-empty HTML; uses brand tokens; is deterministic.
 *  4. Mapping — DocModel block -> ProseMirror node -> DocModel block round-trips losslessly.
 *  5. Editor — TipTap can insert the block via the registered command.
 *
 * Pattern notes for copy-adapt:
 *  - Keep fixtures inline for small blocks; move to /fixtures/ for large ones.
 *  - For (3), use ReactDOMServer.renderToStaticMarkup wrapped in a test
 *    BrandProvider to get deterministic HTML — don't depend on a browser DOM.
 *  - For (4), the round-trip test is THE acceptance criterion for the
 *    DocModel<->editor mapping (BUILD_BRIEF M4).
 *  - Snapshot tests are fine, but prefer explicit assertions for shape/structure
 *    so failures point at the cause, not a diff.
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

import {
  CalloutBlockSchema,
  calloutTintTokenFor,
  type CalloutBlock,
} from "./schema";
import { Callout } from "./Callout";
import {
  CalloutTipTapNode,
  calloutBlockToProseMirror,
  proseMirrorToCalloutBlock,
} from "./CalloutNode";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";   // adjust path

// ── Test fixtures ───────────────────────────────────────────────────────────

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
      primary: "#0B3D91", secondary: "#E8A33D",
      dark: "#0A1A2F", light: "#F4F7FC",
    },
    neutral: { "0": "#FFFFFF", "200": "#E2E8F0", "600": "#475569", "800": "#1E293B" },
    semantic: {
      surfaceBackground: "neutral.200",
      border: "neutral.200",
      textPrimary: "neutral.800",
      textSecondary: "neutral.600",
    },
    status: { info: "#1D4ED8", success: "#15803D", warning: "#B45309", error: "#B91C1C" },
    chartPalette: {
      qualitative: ["#0B3D91", "#E8A33D", "#2D9C5A", "#C44536", "#7C3AED", "#0891B2", "#65A30D", "#DB2777"],
      sequential: ["#F4F7FC", "#7FA3DC", "#0B3D91"],
    },
  },
  typography: {
    fonts: {
      heading: { family: "Inter", source: "google", weights: [600, 700] },
      body: { family: "Inter", source: "google", weights: [400, 500] },
      mono: { family: "JetBrains Mono", source: "google", weights: [400] },
    },
    scale: { body: 11, bodyLg: 13, caption: 9, h1: 32, h2: 24, h3: 20, h4: 16 },
    lineHeight: { tight: 1.15, normal: 1.5 },
  },
  spacing: { unit: 4, scale: [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48] },
  page: {
    size: "A4", orientation: "portrait",
    margins: { top: 24, right: 18, bottom: 22, left: 18 },
  },
  deck: {
    slideSize: "16:9",
    dimensionsPx: { width: 1920, height: 1080 },
    margins: { top: 72, right: 96, bottom: 72, left: 96 },
  },
  elements: {}, charts: {},
} as const;

// ── 1. Schema — valid fixtures ──────────────────────────────────────────────

describe("CalloutBlockSchema — valid fixtures", () => {
  it("accepts an 'info' callout with title and body", () => {
    const result = CalloutBlockSchema.safeParse(validInfoCallout);
    expect(result.success).toBe(true);
  });

  it("accepts a 'quote' callout with attribution", () => {
    const result = CalloutBlockSchema.safeParse(validQuoteCallout);
    expect(result.success).toBe(true);
  });

  it("applies the default variant when omitted", () => {
    const { variant, ...withoutVariant } = validInfoCallout;
    const result = CalloutBlockSchema.parse(withoutVariant);
    expect(result.variant).toBe("info");
  });
});

// ── 2. Schema — invalid fixtures ────────────────────────────────────────────

describe("CalloutBlockSchema — invalid fixtures", () => {
  it("rejects an unknown variant", () => {
    const result = CalloutBlockSchema.safeParse({
      ...validInfoCallout,
      variant: "celebration",                  // not in the enum
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("variant");
    }
  });

  it("rejects a title longer than 100 chars", () => {
    const result = CalloutBlockSchema.safeParse({
      ...validInfoCallout,
      title: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing body", () => {
    const { body, ...withoutBody } = validInfoCallout;
    const result = CalloutBlockSchema.safeParse(withoutBody);
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys (strict mode)", () => {
    const result = CalloutBlockSchema.safeParse({
      ...validInfoCallout,
      extraField: "should not be allowed",     // not in the schema
    });
    expect(result.success).toBe(false);
  });
});

// ── 3. Renderer — produces non-empty HTML and consumes brand tokens ─────────

describe("Callout renderer", () => {
  const renderWithBrand = (block: CalloutBlock): string => {
    return renderToStaticMarkup(
      createElement(BrandProvider, { tokens: testBrandTokens },
        createElement(Callout, { block })
      )
    );
  };

  it("renders an aside element with the block id and variant", () => {
    const html = renderWithBrand(validInfoCallout);
    expect(html).toContain("<aside");
    expect(html).toContain(`data-block-id="${validInfoCallout.id}"`);
    expect(html).toContain('data-variant="info"');
  });

  it("renders the title when present", () => {
    const html = renderWithBrand(validInfoCallout);
    expect(html).toContain("Why now");
  });

  it("omits the title element when title is absent", () => {
    const html = renderWithBrand({ ...validInfoCallout, title: undefined });
    expect(html).not.toContain("Why now");
  });

  it("renders the attribution only for 'quote' variant", () => {
    const quoteHtml = renderWithBrand(validQuoteCallout);
    expect(quoteHtml).toContain("CFO, board meeting May 2026");

    const infoHtml = renderWithBrand({
      ...validInfoCallout,
      attribution: "Should not appear",
    });
    expect(infoHtml).not.toContain("Should not appear");
  });

  it("uses the variant tint color from brand tokens (not a hard-coded value)", () => {
    const html = renderWithBrand({ ...validInfoCallout, variant: "warning" });
    expect(html).toContain(testBrandTokens.colors.status.warning);    // "#B45309"
    expect(html).not.toContain(testBrandTokens.colors.status.success); // "#15803D"
  });

  it("is deterministic (same input -> same output)", () => {
    const first = renderWithBrand(validInfoCallout);
    const second = renderWithBrand(validInfoCallout);
    expect(first).toBe(second);
  });
});

// ── 4. Mapping — DocModel <-> ProseMirror round-trip ────────────────────────

describe("Callout mapping (DocModel <-> ProseMirror)", () => {
  it("round-trips an info callout losslessly", () => {
    const pm = calloutBlockToProseMirror(validInfoCallout);
    const back = proseMirrorToCalloutBlock(pm as never);
    expect(back).toEqual(validInfoCallout);
  });

  it("round-trips a quote callout with attribution losslessly", () => {
    const pm = calloutBlockToProseMirror(validQuoteCallout);
    const back = proseMirrorToCalloutBlock(pm as never);
    expect(back).toEqual(validQuoteCallout);
  });
});

// ── 5. Editor — TipTap can insert the block via the registered command ──────

describe("Callout TipTap node", () => {
  it("registers an `insertCallout` command", () => {
    const editor = new Editor({
      extensions: [StarterKit, CalloutTipTapNode],
    });

    // Pre: no callouts in the doc
    const before = editor.getJSON();
    expect(JSON.stringify(before)).not.toContain('"type":"callout"');

    // Act: invoke the command
    editor.commands.insertCallout({ variant: "warning", title: "Heads up" });

    // Post: a callout exists with the requested attrs
    const after = editor.getJSON();
    const afterStr = JSON.stringify(after);
    expect(afterStr).toContain('"type":"callout"');
    expect(afterStr).toContain('"variant":"warning"');
    expect(afterStr).toContain('"title":"Heads up"');

    editor.destroy();
  });

  it("can change variant via setCalloutVariant", () => {
    const editor = new Editor({
      extensions: [StarterKit, CalloutTipTapNode],
    });
    editor.commands.insertCallout({ variant: "info" });
    editor.commands.setCalloutVariant("success");

    const json = JSON.stringify(editor.getJSON());
    expect(json).toContain('"variant":"success"');
    expect(json).not.toContain('"variant":"info"');

    editor.destroy();
  });
});

// ── Helper test: calloutTintTokenFor mapping is exhaustive ──────────────────

describe("calloutTintTokenFor", () => {
  const variants = ["info", "success", "warning", "error", "quote", "tip"] as const;

  it.each(variants)("returns a non-empty token reference for variant '%s'", (v) => {
    const token = calloutTintTokenFor(v);
    expect(token.length).toBeGreaterThan(0);
    expect(token).toMatch(/^colors\./);
  });
});

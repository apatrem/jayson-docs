import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderStaticHtmlForExport } from "../../src/export/render-static-html";
import { BrandTokensSchema, type BrandTokens } from "../../src/schema/brand";
import type { DocModel } from "../../src/schema/docmodel";

function loadBrand(): BrandTokens {
  const raw: unknown = parse(readFileSync(join(process.cwd(), "brand.example.yaml"), "utf8"));
  return BrandTokensSchema.parse(raw);
}

const doc: Extract<DocModel, { kind: "document" }> = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: {
    client: "Acme",
    project: "Static HTML export",
    docKind: "proposal",
    tags: [],
    language: "en",
    status: "draft",
    archived: false,
    confidentialityLevel: "medium",
    owner: "owner@example.com",
    reviewers: [],
    createdAt: "2026-05-26T00:00:00Z",
    updatedAt: "2026-05-26T00:00:00Z",
    brandRef: "$brand:default",
  },
  sections: [
    {
      id: "section-1",
      title: "Overview",
      blocks: [
        {
          id: "prose-1",
          type: "prose",
          align: "left",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Safe <script>alert(1)</script> copy",
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
  comments: [],
};

describe("renderStaticHtmlForExport", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    vi.restoreAllMocks();
  });

  it("returns a self-contained paginated HTML shell with our own page chrome", async () => {
    const html = await renderStaticHtmlForExport(doc, loadBrand());

    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('data-doc-kind="document"');
    // Our @page chrome (paged.js): A4 size + page-number footer counter, so the
    // printed PDF shows the title + page number, not Chrome's date/file path.
    expect(html).toMatch(/@page\s*\{/u);
    expect(html).toContain("counter(page)");
    // User-supplied markup is escaped, never executed...
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)");
    // ...while the trusted vendored paged.js polyfill IS inlined so the
    // standalone HTML paginates itself with the header/footer.
    expect(html).toMatch(/<script>[\s\S]+<\/script>/u);
  });

  it("inlines image assets as data URIs", async () => {
    const imageDoc = docWithImages([{ id: "image-1", src: "assets/photo.jpg" }]);
    const invokeMock = vi.fn((cmd: string, args: unknown) => {
      expect(cmd).toBe("read_binary_file");
      expect(args).toEqual({
        path: "/Users/me/Documents/proposal/assets/photo.jpg",
      });
      return Promise.resolve("/9j/");
    });
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    expect(html).toContain('src="data:image/jpeg;base64,/9j/"');
    expect(html).not.toContain("/Users/me/Documents/proposal/assets/photo.jpg");
    expect(html).not.toContain("assets/photo.jpg");
  });

  it("uses a placeholder when the binary IPC rejects the 5 MB image cap", async () => {
    const imageDoc = docWithImages([{ id: "image-1", src: "assets/photo.jpg" }]);
    // Tauri invoke() rejects with the raw IpcError JSON object, NOT an Error
    // instance. Mocking with `new Error(...)` (which the test originally did)
    // creates a test-vs-runtime gap that hid a real placeholder-never-fires
    // bug surfaced during M7 manual validation. See AGENTS.md §Review
    // playbook convention #8 + src/ipc/errors.ts.
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {
        invoke: vi.fn(() =>
          // Tauri rejects with the raw IpcError JSON object (not an Error).
          // We deliberately mirror that shape; the typescript-eslint rule
          // assumes Error-only rejections which doesn't match runtime here.
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          Promise.reject({
            kind: "invalid",
            message: "file exceeds 5MB export limit",
          }),
        ),
      },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    expect(decodedSvgDataUris(html).join("\n")).toContain("Image too large to export");
    expect(html).not.toContain("data:image/jpeg;base64");
  });

  it("uses placeholders after the 50 MB total image payload cap", async () => {
    const imageDoc = docWithImages([
      { id: "image-1", src: "assets/photo-1.jpg" },
      { id: "image-2", src: "assets/photo-2.jpg" },
    ]);
    const totalCapOverflowBase64 = "A".repeat(Math.ceil((50 * 1024 * 1024) / 3) * 4);
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {
        invoke: vi.fn((_cmd: string, args: { path: string }) =>
          Promise.resolve(args.path.endsWith("photo-1.jpg") ? "/w==" : totalCapOverflowBase64),
        ),
      },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    expect(html).toContain('src="data:image/jpeg;base64,/w=="');
    expect(decodedSvgDataUris(html).join("\n")).toContain("Image too large to export");
  });

  it("removes active SVG content before inlining image assets", async () => {
    const imageDoc = docWithImages([{ id: "image-1", src: "assets/vector.svg" }]);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><g onload="alert(1)"><text>Safe</text></g></svg>`;
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {
        invoke: vi.fn(() => Promise.resolve(utf8ToBase64ForTest(svg))),
      },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    const [decodedSvg] = decodedSvgDataUris(html);
    expect(decodedSvg).toContain("<svg");
    expect(decodedSvg).toContain("Safe");
    expect(decodedSvg).not.toMatch(/<script\b/iu);
    expect(decodedSvg).not.toMatch(/\sonload=/iu);
  });

  // T-123p: tripwire suite for the deepened SVG sanitizer. Each case asserts
  // a single attack vector is stripped before the SVG is embedded as a
  // data URI. If a vector regresses (e.g., someone "simplifies" the regex
  // list in `sanitizeSvgForImage`), the corresponding case fails fast.
  describe("sanitizeSvgForImage tripwires (T-123p)", () => {
    async function decodedSvgFor(rawSvg: string): Promise<string> {
      const imageDoc = docWithImages([{ id: "image-1", src: "assets/vector.svg" }]);
      Object.defineProperty(window, "__TAURI_INTERNALS__", {
        configurable: true,
        value: {
          invoke: vi.fn(() => Promise.resolve(utf8ToBase64ForTest(rawSvg))),
        },
      });
      const html = await renderStaticHtmlForExport(
        imageDoc,
        loadBrand(),
        "/Users/me/Documents/proposal",
        "/Users/me/Shared",
      );
      const [decoded] = decodedSvgDataUris(html);
      expect(decoded).toBeDefined();
      return decoded ?? "";
    }

    it("strips <foreignObject> blocks that smuggle HTML/script", async () => {
      const decoded = await decodedSvgFor(
        `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><script>alert(1)</script></foreignObject><text>Safe</text></svg>`,
      );
      expect(decoded).toContain("Safe");
      expect(decoded).not.toMatch(/<foreignObject\b/iu);
      expect(decoded).not.toMatch(/<script\b/iu);
    });

    it("strips <style> blocks (CSS expression / url(javascript:) vector)", async () => {
      const decoded = await decodedSvgFor(
        `<svg xmlns="http://www.w3.org/2000/svg"><style>* { background: url(javascript:alert(1)) }</style><text>Safe</text></svg>`,
      );
      expect(decoded).toContain("Safe");
      expect(decoded).not.toMatch(/<style\b/iu);
      expect(decoded).not.toMatch(/javascript:/iu);
    });

    it("strips SMIL <animate> with attributeName=href→javascript:", async () => {
      const decoded = await decodedSvgFor(
        `<svg xmlns="http://www.w3.org/2000/svg"><a href="#"><animate attributeName="href" to="javascript:alert(1)" /><text>Safe</text></a></svg>`,
      );
      expect(decoded).toContain("Safe");
      expect(decoded).not.toMatch(/<animate\b/iu);
      expect(decoded).not.toMatch(/javascript:/iu);
    });

    it("strips <animateMotion>, <animateTransform>, and <set>", async () => {
      const decoded = await decodedSvgFor(
        `<svg xmlns="http://www.w3.org/2000/svg">` +
          `<animateMotion path="M0,0 L10,10" />` +
          `<animateTransform attributeName="transform" type="rotate" />` +
          `<set attributeName="href" to="javascript:alert(1)" />` +
          `<text>Safe</text>` +
          `</svg>`,
      );
      expect(decoded).toContain("Safe");
      expect(decoded).not.toMatch(/<animateMotion\b/iu);
      expect(decoded).not.toMatch(/<animateTransform\b/iu);
      expect(decoded).not.toMatch(/<set\b/iu);
      expect(decoded).not.toMatch(/javascript:/iu);
    });

    it("strips <use href=javascript:…>", async () => {
      const decoded = await decodedSvgFor(
        `<svg xmlns="http://www.w3.org/2000/svg"><use href="javascript:alert(1)" /><text>Safe</text></svg>`,
      );
      expect(decoded).toContain("Safe");
      expect(decoded).not.toMatch(/javascript:/iu);
    });

    it("strips <a xlink:href=javascript:…>", async () => {
      const decoded = await decodedSvgFor(
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="javascript:alert(1)"><text>Safe</text></a></svg>`,
      );
      expect(decoded).toContain("Safe");
      expect(decoded).not.toMatch(/javascript:/iu);
    });

    it("preserves benign http(s) hrefs and harmless content", async () => {
      const decoded = await decodedSvgFor(
        `<svg xmlns="http://www.w3.org/2000/svg"><a href="https://example.com"><text>Click</text></a></svg>`,
      );
      expect(decoded).toContain("Click");
      expect(decoded).toContain("https://example.com");
    });
  });
});

describe("renderStaticHtmlForExport without Node Buffer", () => {
  let originalBuffer: unknown;

  beforeEach(() => {
    originalBuffer = (globalThis as { Buffer?: unknown }).Buffer;
    Reflect.deleteProperty(globalThis, "Buffer");
  });

  afterEach(() => {
    if (originalBuffer !== undefined) {
      (globalThis as { Buffer?: unknown }).Buffer = originalBuffer;
    }
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    vi.restoreAllMocks();
  });

  it("inlines SVG images without throwing ReferenceError", async () => {
    const imageDoc = docWithImages([{ id: "image-1", src: "assets/vector.svg" }]);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><text>Safe</text></svg>`;
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {
        invoke: vi.fn(() => Promise.resolve(utf8ToBase64ForTest(svg))),
      },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    const [decodedSvg] = decodedSvgDataUris(html);
    expect(decodedSvg).toContain("Safe");
    expect(decodedSvg).not.toMatch(/<script\b/iu);
  });

  it("emits the oversized-image placeholder without throwing ReferenceError", async () => {
    const imageDoc = docWithImages([{ id: "image-1", src: "assets/photo.jpg" }]);
    // See sibling test's comment: mock with the IpcError JSON shape, not
    // with an Error instance. The runtime parity matters; see AGENTS.md
    // §Review playbook convention #8.
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {
        invoke: vi.fn(() =>
          // Tauri rejects with the raw IpcError JSON object (not an Error).
          // We deliberately mirror that shape; the typescript-eslint rule
          // assumes Error-only rejections which doesn't match runtime here.
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          Promise.reject({
            kind: "invalid",
            message: "file exceeds 5MB export limit",
          }),
        ),
      },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    expect(decodedSvgDataUris(html).join("\n")).toContain("Image too large to export");
  });

  it("emits the total-cap-exhausted placeholder without throwing", async () => {
    const imageDoc = docWithImages([
      { id: "image-1", src: "assets/photo-1.jpg" },
      { id: "image-2", src: "assets/photo-2.jpg" },
    ]);
    const totalCapOverflowBase64 = "A".repeat(Math.ceil((50 * 1024 * 1024) / 3) * 4);
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: {
        invoke: vi.fn((_cmd: string, args: { path: string }) =>
          Promise.resolve(args.path.endsWith("photo-1.jpg") ? "/w==" : totalCapOverflowBase64),
        ),
      },
    });

    const html = await renderStaticHtmlForExport(
      imageDoc,
      loadBrand(),
      "/Users/me/Documents/proposal",
      "/Users/me/Shared",
    );

    expect(html).toContain('src="data:image/jpeg;base64,/w=="');
    expect(decodedSvgDataUris(html).join("\n")).toContain("Image too large to export");
  });
});

function docWithImages(
  images: Array<{ id: string; src: string }>,
): Extract<DocModel, { kind: "document" }> {
  return {
    ...doc,
    sections: [
      {
        ...doc.sections[0]!,
        blocks: [
          ...doc.sections[0]!.blocks,
          ...images.map(({ id, src }) => ({
            id,
            type: "image" as const,
            src,
            alt: "Team workshop",
            caption: "Workshop photo",
            width: "medium" as const,
            align: "center" as const,
          })),
        ],
      },
    ],
  };
}

function decodedSvgDataUris(html: string): string[] {
  // Capture only the base64 run (not greedily up to the next quote) so the
  // inlined paged.js polyfill — which may contain a "data:image/svg+xml;base64,"
  // substring — can't pull arbitrary JS into the match and break atob.
  return Array.from(
    html.matchAll(/data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/giu),
    (match) => base64ToUtf8ForTest(match[1] ?? ""),
  );
}

function utf8ToBase64ForTest(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUtf8ForTest(encoded: string): string {
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

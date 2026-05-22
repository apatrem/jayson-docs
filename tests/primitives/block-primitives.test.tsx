import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Card, Stack } from "../../src/block-primitives";
import { BrandTokensSchema } from "../../src/schema/brand";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

function render(ui: ReactElement) {
  return renderToStaticMarkup(
    createElement(BrandProvider, { tokens: brand }, ui),
  );
}

describe("block primitives", () => {
  it("Stack uses brand spacing scale", () => {
    const html = render(
      createElement(Stack, { gap: 2 }, createElement("span", null, "x")),
    );
    expect(html).toContain('style="');
    expect(html).toContain("gap:8px");
  });

  it("Card uses brand neutral surface colors", () => {
    const html = render(
      createElement(Card, null, createElement("span", null, "body")),
    );
    expect(html).toContain("#F8FAFC");
    expect(html).toContain("#E2E8F0");
  });
});

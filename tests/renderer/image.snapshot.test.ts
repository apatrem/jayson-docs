import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Image } from "../../src/renderer/blocks/Image";
import type { AssetContext } from "../../src/brand-tokens/resolve-asset";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { ImageBlock } from "../../src/schema/blocks/image";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const assetContext: AssetContext = {
  sharedFolderPath: repoRoot,
  docFolderPath: repoRoot,
  brand,
};

const block: ImageBlock = {
  id: "test-image",
  type: "image",
  src: "assets/logo/primary.svg",
  alt: "Company logo",
  caption: "Figure 1: Company logo",
  width: "medium",
  align: "center",
};

describe("Image snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Image, { block, assetContext }),
      ),
    );

    expect(html).toContain('data-block-type="image"');
    expect(html).toContain('alt="Company logo"');
    expect(html).toContain("Figure 1: Company logo");
    expect(html).toContain("<figure");
    expect(html).toContain("<img");
  });
});

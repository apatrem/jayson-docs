import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import { Team } from "../../src/blocks/team";
import type { AssetContext } from "../../src/brand-tokens/resolve-asset";
import { BrandTokensSchema } from "../../src/schema/brand";
import type { TeamBlock } from "../../src/blocks/team/schema";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const brand = BrandTokensSchema.parse(
  parse(readFileSync(join(repoRoot, "brand.example.yaml"), "utf8")),
);

const assetContext: AssetContext = {
  sharedFolderPath: repoRoot,
  docFolderPath: repoRoot,
  brand,
};

const block: TeamBlock = {
  id: "test-team",
  type: "team",
  layout: "grid",
  members: [
    { name: "Alice Martin", role: "Engagement Manager" },
    { name: "Bob Chen", role: "Senior Consultant" },
    { name: "Carol Davis", role: "Analyst" },
  ],
};

describe("Team snapshot (T-141a)", () => {
  it("renders under new brand tokens", () => {
    const html = renderToStaticMarkup(
      createElement(BrandProvider, { tokens: brand },
        createElement(Team, { block, assetContext }),
      ),
    );

    expect(html).toContain('data-block-type="team"');
    expect(html).toContain("Alice Martin");
    expect(html).toContain("Engagement Manager");
    expect(html).toContain("Bob Chen");
    expect(html).toContain("Carol Davis");
  });
});

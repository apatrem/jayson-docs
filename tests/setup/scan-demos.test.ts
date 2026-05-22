import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, afterEach } from "vitest";
import { parse } from "yaml";
import { BrandTokensSchema } from "../../src/schema/brand";
import { scanDemos } from "../../src/setup/scan-demos";
import { MockLlmClient } from "../../src/setup/llm-client";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureInput = join(repoRoot, "tests/fixtures/setup-demos");

describe("scanDemos (T-48)", () => {
  let outputDir: string;

  afterEach(() => {
    if (outputDir) {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("produces brand.draft.yaml, catalogue-diff.json, pending blocks, and setup-report.md", async () => {
    outputDir = mkdtempSync(join(tmpdir(), "setup-scan-out-"));

    const result = await scanDemos({
      inputDir: fixtureInput,
      outputDir,
      llm: new MockLlmClient(),
    });

    expect(result.outputDir).toBe(outputDir);
    expect(existsSync(join(outputDir, "demo-analysis.json"))).toBe(true);
    expect(existsSync(join(outputDir, "brand.draft.yaml"))).toBe(true);
    expect(existsSync(join(outputDir, "catalogue-diff.json"))).toBe(true);
    expect(existsSync(join(outputDir, "setup-report.md"))).toBe(true);
    expect(existsSync(join(outputDir, "generated-blocks/pending"))).toBe(
      true,
    );

    const brand: unknown = parse(
      readFileSync(join(outputDir, "brand.draft.yaml"), "utf8"),
    );
    expect(BrandTokensSchema.safeParse(brand).success).toBe(true);

    const diff = JSON.parse(
      readFileSync(join(outputDir, "catalogue-diff.json"), "utf8"),
    ) as {
      newBlockProposals: { proposedId: string }[];
    };

    for (const proposal of diff.newBlockProposals) {
      expect(
        existsSync(
          join(
            outputDir,
            "generated-blocks/pending",
            proposal.proposedId,
            "schema.ts",
          ),
        ),
      ).toBe(true);
    }
  });
});

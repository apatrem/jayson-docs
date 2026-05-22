import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BrandTokensSchema } from "../../src/schema/brand";
import {
  extractBrandDraft,
  MAX_BRAND_EXTRACTION_RETRIES,
} from "../../src/setup/extract-brand";
import type { DemoAnalysis } from "../../src/setup/ingestion/types";
import { MockLlmClient } from "../../src/setup/llm-client";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const analysis = JSON.parse(
  readFileSync(
    join(repoRoot, "tests/fixtures/setup-demos/demo-analysis.json"),
    "utf8",
  ),
) as DemoAnalysis;

describe("extractBrandDraft", () => {
  it("produces brand.draft.yaml that passes BrandTokensSchema", async () => {
    const { draftYaml, brand, attempts } = await extractBrandDraft(analysis, {
      llm: new MockLlmClient(),
    });

    expect(attempts).toBeGreaterThanOrEqual(1);
    expect(attempts).toBeLessThanOrEqual(MAX_BRAND_EXTRACTION_RETRIES + 1);
    expect(BrandTokensSchema.safeParse(brand).success).toBe(true);
    expect(BrandTokensSchema.safeParse(parse(draftYaml)).success).toBe(true);
    expect(brand.colors.brand.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("retries with corrective re-prompt on validation failure", async () => {
    let calls = 0;
    const llm = new MockLlmClient({
      responder: () => {
        calls += 1;
        if (calls === 1) {
          return "schemaVersion: '9.9.9'\nidentity:\n  name: Bad\n";
        }
        return "__MOCK_BRAND_YAML__";
      },
    });

    const result = await extractBrandDraft(analysis, { llm });
    expect(calls).toBe(2);
    expect(result.attempts).toBe(2);
    expect(BrandTokensSchema.safeParse(result.brand).success).toBe(true);
  });
});

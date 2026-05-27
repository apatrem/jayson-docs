import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CatalogueDiffSchema } from "../../src/setup/catalogue-diff";
import { MockLlmClient } from "../../src/setup/llm-client";
import type { LlmMessage } from "../../src/setup/llm-client";
import { scanDemos } from "../../src/setup/scan-demos";
import { BrandTokensSchema } from "../../src/schema/brand";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureInput = join(repoRoot, "tests/fixtures/demos");

// Responder that always proposes one new block so code-generation runs
function proposingResponder(messages: LlmMessage[]): string {
  const text = messages.map((m) => m.content).join("\n");
  if (
    text.includes("pre-built block catalogue") ||
    text.includes("catalogue diff")
  ) {
    return JSON.stringify({
      usedBlocks: ["prose", "heading"],
      unusedBlocks: [
        "bullet-list",
        "numbered-list",
        "chart",
        "table",
        "callout",
        "kpi-cards",
        "timeline",
        "roadmap",
        "risk-matrix",
        "team",
        "image",
        "diagram",
        "divider",
      ],
      newBlockProposals: [
        {
          proposedId: "stat-badge",
          name: "Stat Badge",
          description: "Compact KPI highlight from slide titles",
          observedIn: ["sample.pptx:slide-1", "sample.docx:section-1"],
          proposedSchema: { fields: { label: "string", value: "string" } },
          rationale: "Repeated title+metric pairs not covered by kpi-cards",
        },
      ],
    });
  }
  if (
    text.includes("four files") ||
    text.includes("Scaffold templates")
  ) {
    // Valid code — will pass lint
    return "__INVALID_JSON__";
  }
  return "__MOCK_BRAND_YAML__";
}

// Responder that generates a renderer with dangerouslySetInnerHTML
function maliciousCodeResponder(messages: LlmMessage[]): string {
  const text = messages.map((m) => m.content).join("\n");
  if (
    text.includes("pre-built block catalogue") ||
    text.includes("catalogue diff")
  ) {
    return JSON.stringify({
      usedBlocks: ["prose", "heading"],
      unusedBlocks: [
        "bullet-list",
        "numbered-list",
        "chart",
        "table",
        "callout",
        "kpi-cards",
        "timeline",
        "roadmap",
        "risk-matrix",
        "team",
        "image",
        "diagram",
        "divider",
      ],
      newBlockProposals: [
        {
          proposedId: "stat-badge",
          name: "Stat Badge",
          description: "Compact KPI highlight",
          observedIn: ["sample.docx:section-1", "sample.pptx:slide-1"],
          proposedSchema: { fields: { label: "string", value: "string" } },
          rationale: "Repeated KPI pairs",
        },
      ],
    });
  }
  if (
    text.includes("four files") ||
    text.includes("Scaffold templates")
  ) {
    // Malicious renderer — contains dangerouslySetInnerHTML
    return JSON.stringify({
      files: [
        {
          path: "schema.ts",
          content: [
            "import { z } from 'zod';",
            "export const StatBadgeBlockSchema = z.object({",
            "  label: z.string().max(80),",
            "  value: z.string().max(40),",
            "}).strict();",
            "export type StatBadgeBlock = z.infer<typeof StatBadgeBlockSchema>;",
          ].join("\n"),
        },
        {
          path: "StatBadge.tsx",
          content: [
            "import React from 'react';",
            "export function StatBadge({ block }: { block: { label: string; value: string } }) {",
            "  return <div dangerouslySetInnerHTML={{ __html: block.value }} />;",
            "}",
          ].join("\n"),
        },
        {
          path: "StatBadgeNode.tsx",
          content: "export default {};",
        },
        {
          path: "stat-badge.test.ts",
          content: "// placeholder test",
        },
      ],
    });
  }
  return "__MOCK_BRAND_YAML__";
}

describe("setup-pipeline e2e (T-133)", () => {
  let outputDir = "";

  afterEach(() => {
    if (outputDir) {
      rmSync(outputDir, { recursive: true, force: true });
      outputDir = "";
    }
  });

  it("(a) brand.draft.yaml is written and validates against BrandTokensSchema", async () => {
    outputDir = mkdtempSync(join(tmpdir(), "e2e-brand-"));
    await scanDemos({
      inputDir: fixtureInput,
      outputDir,
      llm: new MockLlmClient(),
    });

    const brandPath = join(outputDir, "brand.draft.yaml");
    expect(existsSync(brandPath)).toBe(true);
    const brand: unknown = parse(readFileSync(brandPath, "utf8"));
    const result = BrandTokensSchema.safeParse(brand);
    expect(result.success).toBe(true);
  });

  it("(b) catalogue-diff.json is structurally valid (CatalogueDiffSchema)", async () => {
    outputDir = mkdtempSync(join(tmpdir(), "e2e-diff-"));
    await scanDemos({
      inputDir: fixtureInput,
      outputDir,
      llm: new MockLlmClient(),
    });

    const diffPath = join(outputDir, "catalogue-diff.json");
    expect(existsSync(diffPath)).toBe(true);
    const diff: unknown = JSON.parse(readFileSync(diffPath, "utf8"));
    const result = CatalogueDiffSchema.safeParse(diff);
    expect(result.success).toBe(true);
  });

  it("(c) 0–10 generated-block proposals appear in generated-blocks/pending/", async () => {
    outputDir = mkdtempSync(join(tmpdir(), "e2e-blocks-"));
    const result = await scanDemos({
      inputDir: fixtureInput,
      outputDir,
      llm: new MockLlmClient({ responder: proposingResponder }),
    });

    expect(result.proposalCount).toBeGreaterThanOrEqual(0);
    expect(result.proposalCount).toBeLessThanOrEqual(10);
    for (const blockId of result.generatedBlockIds) {
      expect(
        existsSync(
          join(outputDir, "generated-blocks/pending", blockId, "schema.ts"),
        ),
      ).toBe(true);
    }
  });

  it("(d) lint pass rejects a generated block containing dangerouslySetInnerHTML", async () => {
    outputDir = mkdtempSync(join(tmpdir(), "e2e-malicious-"));
    await expect(
      scanDemos({
        inputDir: fixtureInput,
        outputDir,
        llm: new MockLlmClient({ responder: maliciousCodeResponder }),
      }),
    ).rejects.toThrow(/lint failed for stat-badge/u);
  });
});

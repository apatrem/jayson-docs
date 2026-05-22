import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import type { NewBlockProposal } from "../../src/setup/catalogue-diff";
import {
  buildStatBadgeGeneratedFiles,
  fillScaffoldTemplate,
  generateBlock,
} from "../../src/setup/generate-block";
import { lintGeneratedBlockFiles } from "../../src/setup/lint-generated";
import { MockLlmClient } from "../../src/setup/llm-client";

const proposal: NewBlockProposal = {
  proposedId: "stat-badge",
  name: "Stat Badge",
  description: "Compact KPI highlight",
  observedIn: ["sample.pptx:slide-1", "sample.docx:p.2"],
  proposedSchema: { label: "string", value: "string" },
  rationale: "Repeated metric tiles",
};

describe("generateBlock", () => {
  it("fills scaffold templates with AI_FILL markers", () => {
    const template = "// {{AI_FILL: x}}\nexport const {{BlockName}} = 1;";
    const filled = fillScaffoldTemplate(template, {
      BlockName: "StatBadge",
      "AI_FILL: x": "label: z.string()",
    });
    expect(filled).toContain("StatBadge");
    expect(filled).toContain("label: z.string()");
  });

  it("produces four syntactically valid TypeScript files", async () => {
    const outputDir = mkdtempSync(join(tmpdir(), "gen-block-out-"));
    const result = await generateBlock(proposal, {
      llm: new MockLlmClient(),
      outputDir,
    });

    expect(result.files).toHaveLength(4);
    expect(result.blockId).toBe("stat-badge");
    for (const file of result.files) {
      expect(readFileSync(join(outputDir, file.path), "utf8").length).toBeGreaterThan(
        0,
      );
    }

    const lint = lintGeneratedBlockFiles(result.files);
    expect(lint.ok).toBe(true);
  });

  it("buildStatBadgeGeneratedFiles passes lint", () => {
    const files = buildStatBadgeGeneratedFiles(proposal, "test-model");
    const lint = lintGeneratedBlockFiles(files);
    expect(lint.ok).toBe(true);
    expect(files.some((f) => f.path === "schema.ts")).toBe(true);
  });
});

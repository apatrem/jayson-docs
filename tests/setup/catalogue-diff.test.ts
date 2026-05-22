import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  MAX_NEW_BLOCK_PROPOSALS,
  runCatalogueDiff,
  validateCatalogueDiff,
} from "../../src/setup/catalogue-diff";
import type { DemoAnalysis } from "../../src/setup/ingestion/types";
import { MockLlmClient } from "../../src/setup/llm-client";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const analysis = JSON.parse(
  readFileSync(
    join(repoRoot, "tests/fixtures/setup-demos/demo-analysis.json"),
    "utf8",
  ),
) as DemoAnalysis;

describe("runCatalogueDiff", () => {
  it("returns usedBlocks, unusedBlocks, and newBlockProposals", async () => {
    const outcome = await runCatalogueDiff(analysis, {
      llm: new MockLlmClient(),
    });
    expect("ok" in outcome && outcome.ok).toBe(true);
    if (!("ok" in outcome) || !outcome.ok) return;
    expect(outcome.diff.usedBlocks.length).toBeGreaterThan(0);
    expect(outcome.diff.unusedBlocks.length).toBeGreaterThan(0);
    expect(Array.isArray(outcome.diff.newBlockProposals)).toBe(true);
  });

  it("returns escalate when proposals exceed the cap", () => {
    const proposals = Array.from({ length: MAX_NEW_BLOCK_PROPOSALS + 1 }, (_, i) => ({
      proposedId: `block-${i}`,
      name: `Block ${i}`,
      description: "desc",
      observedIn: ["a.docx:p.1", "b.docx:p.2"],
      proposedSchema: {},
      rationale: "needed",
    }));
    const outcome = validateCatalogueDiff({
      usedBlocks: ["prose"],
      unusedBlocks: ["heading"],
      newBlockProposals: proposals,
    });
    expect("escalate" in outcome && outcome.escalate).toBe(true);
  });

  it("returns escalate from explicit LLM escalation payload", async () => {
    const llm = new MockLlmClient({
      responder: () =>
        JSON.stringify({ escalate: true, reason: "too many distinct patterns" }),
    });
    const outcome = await runCatalogueDiff(analysis, { llm });
    expect("escalate" in outcome && outcome.escalate).toBe(true);
  });
});

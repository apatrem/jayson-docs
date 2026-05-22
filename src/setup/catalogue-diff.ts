import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { DemoAnalysis } from "./ingestion/types";
import type { LlmClient, LlmMessage } from "./llm-client";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

export const MAX_NEW_BLOCK_PROPOSALS = 10;

const PREBUILT_BLOCK_IDS = [
  "prose",
  "heading",
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
] as const;

const NewBlockProposalSchema = z.object({
  proposedId: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1),
  description: z.string().min(1),
  observedIn: z.array(z.string()).min(1),
  proposedSchema: z.record(z.unknown()),
  rationale: z.string().min(1),
});

export const CatalogueDiffSchema = z.object({
  usedBlocks: z.array(z.string()),
  unusedBlocks: z.array(z.string()),
  newBlockProposals: z.array(NewBlockProposalSchema),
});

export type NewBlockProposal = z.infer<typeof NewBlockProposalSchema>;
export type CatalogueDiff = z.infer<typeof CatalogueDiffSchema>;

export type CatalogueDiffEscalation = {
  escalate: true;
  reason: string;
};

export type CatalogueDiffOutcome =
  | { ok: true; diff: CatalogueDiff }
  | CatalogueDiffEscalation
  | { ok: false; error: string };

const STAGE3_SYSTEM = `You are reviewing a consultancy's demo files to identify which block types
from a pre-built catalogue they use, and whether any observed patterns
require a new block type.

You may propose at most 10 new blocks. If you think more are needed, output
{"escalate": true, "reason": "..."} and stop.

A new block should be proposed ONLY if:
- The pattern appears ≥ 2 times across the demo files, AND
- It cannot be expressed by any Tier 1 block with brand-token tweaks alone`;

export interface CatalogueDiffOptions {
  llm: LlmClient;
  cataloguePath?: string;
}

function buildStage3Messages(
  analysis: DemoAnalysis,
  catalogueYaml: string,
): LlmMessage[] {
  return [
    { role: "system", content: STAGE3_SYSTEM },
    {
      role: "user",
      content: [
        JSON.stringify(analysis, null, 2),
        "",
        "The pre-built block catalogue:",
        catalogueYaml,
        "",
        "Produce a catalogue diff in this shape:",
        JSON.stringify(
          {
            usedBlocks: ["block-id-1"],
            unusedBlocks: ["block-id-2"],
            newBlockProposals: [],
          },
          null,
          2,
        ),
      ].join("\n"),
    },
  ];
}

function parseJsonFromLlm(raw: string): unknown {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  const body = fence?.[1]?.trim() ?? trimmed;
  return JSON.parse(body);
}

function normalizeBlockIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export function validateCatalogueDiff(raw: unknown): CatalogueDiffOutcome {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "escalate" in raw &&
    (raw as { escalate: unknown }).escalate === true
  ) {
    const reason =
      typeof (raw as { reason?: unknown }).reason === "string"
        ? String((raw as { reason?: unknown }).reason)
        : "too many new block proposals";
    return { escalate: true, reason };
  }

  const parsed = CatalogueDiffSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.path.join(".")).join(", "),
    };
  }

  if (parsed.data.newBlockProposals.length > MAX_NEW_BLOCK_PROPOSALS) {
    return {
      escalate: true,
      reason: `newBlockProposals.length (${parsed.data.newBlockProposals.length}) exceeds cap of ${MAX_NEW_BLOCK_PROPOSALS}`,
    };
  }

  const known = new Set<string>(PREBUILT_BLOCK_IDS);
  for (const id of [...parsed.data.usedBlocks, ...parsed.data.unusedBlocks]) {
    if (!known.has(id)) {
      return { ok: false, error: `unknown block id: ${id}` };
    }
  }

  return { ok: true, diff: parsed.data };
}

/** Heuristic fallback for tests without a real LLM. */
export function catalogueDiffFromAnalysis(analysis: DemoAnalysis): CatalogueDiff {
  const text = analysis.textContent.toLowerCase();
  const used = new Set<string>(["prose", "heading"]);
  if (text.includes("chart") || text.includes("kpi")) used.add("chart");
  if (text.includes("callout") || text.includes("summary")) used.add("callout");
  if (text.includes("timeline")) used.add("timeline");
  if (text.includes("team")) used.add("team");

  const usedBlocks = normalizeBlockIds([...used]);
  const unusedBlocks = PREBUILT_BLOCK_IDS.filter((id) => !used.has(id));

  return {
    usedBlocks,
    unusedBlocks,
    newBlockProposals: [],
  };
}

export async function runCatalogueDiff(
  analysis: DemoAnalysis,
  options: CatalogueDiffOptions,
): Promise<CatalogueDiffOutcome> {
  const cataloguePath =
    options.cataloguePath ?? join(repoRoot, "blocks.catalogue.yaml");
  const catalogueYaml = readFileSync(cataloguePath, "utf8");
  const raw = await options.llm.complete(buildStage3Messages(analysis, catalogueYaml));

  let parsed: unknown;
  try {
    parsed = parseJsonFromLlm(raw);
  } catch {
    return { ok: false, error: "LLM response is not valid JSON" };
  }

  return validateCatalogueDiff(parsed);
}

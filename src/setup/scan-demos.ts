import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { analyzeDemoDirectory, writeDemoAnalysis } from "./ingestion/analyze";
import { extractBrandDraft } from "./extract-brand";
import { runCatalogueDiff } from "./catalogue-diff";
import { generateBlock } from "./generate-block";
import { lintGeneratedBlockFiles } from "./lint-generated";
import type { LlmClient } from "./llm-client";
import { MockLlmClient } from "./llm-client";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

export interface ScanDemosOptions {
  inputDir: string;
  outputDir: string;
  llm?: LlmClient;
}

export interface ScanDemosResult {
  outputDir: string;
  proposalCount: number;
  generatedBlockIds: string[];
}

function parseArgs(argv: string[]): { inputDir: string; outputDir: string } {
  let inputDir = "";
  let outputDir = "";
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input" && argv[i + 1]) {
      inputDir = argv[++i] ?? "";
    } else if (arg === "--output" && argv[i + 1]) {
      outputDir = argv[++i] ?? "";
    }
  }
  if (!inputDir || !outputDir) {
    throw new Error(
      "usage: setup:scan-demos -- --input <demos-dir> --output <setup-output-dir>",
    );
  }
  return { inputDir, outputDir };
}

export function createDefaultSetupLlmClient(): LlmClient {
  if (
    process.env.SETUP_USE_MOCK_LLM === "1" ||
    (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY)
  ) {
    return new MockLlmClient();
  }
  return new MockLlmClient();
}

function buildSetupReport(options: {
  inputDir: string;
  outputDir: string;
  usedBlocks: string[];
  unusedBlocks: string[];
  newBlockIds: string[];
  escalated: boolean;
}): string {
  const lines = [
    "# Setup scan report",
    "",
    `**Input:** ${options.inputDir}`,
    `**Output:** ${options.outputDir}`,
    "",
    "## Catalogue diff",
    "",
    `- Used blocks (${options.usedBlocks.length}): ${options.usedBlocks.join(", ") || "(none)"}`,
    `- Unused blocks (${options.unusedBlocks.length}): ${options.unusedBlocks.slice(0, 8).join(", ")}${options.unusedBlocks.length > 8 ? "…" : ""}`,
    `- New block proposals: ${options.newBlockIds.length}`,
  ];
  if (options.newBlockIds.length > 0) {
    lines.push("", "Generated (pending review):", ...options.newBlockIds.map((id) => `- ${id}`));
  }
  if (options.escalated) {
    lines.push("", "> **Escalation:** more than 10 new blocks proposed — pipeline halted.");
  }
  lines.push(
    "",
    "## Next steps",
    "",
    "1. Review `brand.draft.yaml` and move to the shared folder as `brand.yaml` after approval.",
    "2. Review each folder under `generated-blocks/pending/`; run lint; move approved blocks to `generated-blocks/active/`.",
    "3. The app loads generated blocks from `active/` only (see `load-generated-blocks.ts`).",
    "",
  );
  return lines.join("\n");
}

export async function scanDemos(
  options: ScanDemosOptions,
): Promise<ScanDemosResult> {
  const llm = options.llm ?? createDefaultSetupLlmClient();
  const { inputDir, outputDir } = options;

  await mkdir(outputDir, { recursive: true });
  await mkdir(join(outputDir, "generated-blocks", "pending"), {
    recursive: true,
  });

  const analysis = await analyzeDemoDirectory(inputDir);
  await writeDemoAnalysis(
    analysis,
    join(outputDir, "demo-analysis.json"),
  );

  const brandResult = await extractBrandDraft(analysis, {
    llm,
    brandExamplePath: join(repoRoot, "brand.example.yaml"),
  });
  await writeFile(
    join(outputDir, "brand.draft.yaml"),
    `${brandResult.draftYaml}\n`,
    "utf8",
  );

  const diffOutcome = await runCatalogueDiff(analysis, {
    llm,
    cataloguePath: join(repoRoot, "blocks.catalogue.yaml"),
  });

  if ("escalate" in diffOutcome && diffOutcome.escalate) {
    await writeFile(
      join(outputDir, "catalogue-diff.json"),
      `${JSON.stringify(diffOutcome, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      join(outputDir, "setup-report.md"),
      buildSetupReport({
        inputDir,
        outputDir,
        usedBlocks: [],
        unusedBlocks: [],
        newBlockIds: [],
        escalated: true,
      }),
      "utf8",
    );
    throw new Error(`catalogue diff escalated: ${diffOutcome.reason}`);
  }

  if (!("ok" in diffOutcome) || !diffOutcome.ok) {
    throw new Error(
      `catalogue diff failed: ${"error" in diffOutcome ? diffOutcome.error : "unknown"}`,
    );
  }

  const diff = diffOutcome.diff;
  await writeFile(
    join(outputDir, "catalogue-diff.json"),
    `${JSON.stringify(diff, null, 2)}\n`,
    "utf8",
  );

  const generatedBlockIds: string[] = [];
  const pendingRoot = join(outputDir, "generated-blocks", "pending");

  for (const proposal of diff.newBlockProposals) {
    const blockDir = join(pendingRoot, proposal.proposedId);
    const generated = await generateBlock(proposal, {
      llm,
      outputDir: blockDir,
    });
    const lint = lintGeneratedBlockFiles(generated.files);
    if (!lint.ok) {
      throw new Error(
        `lint failed for ${proposal.proposedId}: ${lint.violations.map((v) => v.message).join("; ")}`,
      );
    }
    generatedBlockIds.push(proposal.proposedId);
  }

  await writeFile(
    join(outputDir, "setup-report.md"),
    buildSetupReport({
      inputDir,
      outputDir,
      usedBlocks: diff.usedBlocks,
      unusedBlocks: diff.unusedBlocks,
      newBlockIds: generatedBlockIds,
      escalated: false,
    }),
    "utf8",
  );

  return {
    outputDir,
    proposalCount: diff.newBlockProposals.length,
    generatedBlockIds,
  };
}

async function main(): Promise<void> {
  const { inputDir, outputDir } = parseArgs(process.argv.slice(2));
  await scanDemos({ inputDir, outputDir });
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : "";

if (import.meta.url === invokedPath) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`setup:scan-demos failed: ${message}`);
    process.exit(1);
  });
}

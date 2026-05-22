import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { NewBlockProposal } from "./catalogue-diff";
import {
  discoverGeneratedBlocksInDirectory,
  resolveGeneratedBlockPaths,
} from "./load-generated-blocks";
import { generateBlock, SCAFFOLD_VERSION } from "./generate-block";
import type { LlmClient } from "./llm-client";
import { MockLlmClient } from "./llm-client";
import { lintGeneratedBlockFiles } from "./lint-generated";

export interface RegenerateOptions {
  installRoot: string;
  scaffoldVersion?: string;
  llm?: LlmClient;
}

export interface BlockDriftReport {
  blockId: string;
  changedFiles: string[];
  outputDirectory: string;
}

export interface RegenerateResult {
  scaffoldVersion: string;
  driftedBlocks: BlockDriftReport[];
  unchangedBlocks: string[];
}

function parseArgs(argv: string[]): RegenerateOptions {
  let installRoot = "";
  let scaffoldVersion = SCAFFOLD_VERSION;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--against" && argv[i + 1]) {
      const against = argv[++i] ?? "";
      installRoot = against.replace(/\/generated-blocks\/active\/?$/, "");
    } else if (arg === "--scaffold-version" && argv[i + 1]) {
      scaffoldVersion = argv[++i] ?? SCAFFOLD_VERSION;
    }
  }
  if (!installRoot) {
    throw new Error(
      "usage: setup:regenerate -- --against <install-root-or-active> [--scaffold-version current]",
    );
  }
  return { installRoot, scaffoldVersion };
}

async function hashDirectoryFiles(
  blockDir: string,
  fileNames: string[],
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const name of fileNames) {
    const content = await readFile(join(blockDir, name), "utf8");
    hashes[name] = createHash("sha256").update(content).digest("hex");
  }
  return hashes;
}

function proposalForBlock(blockId: string): NewBlockProposal {
  return {
    proposedId: blockId,
    name: blockId,
    description: `Regenerated block ${blockId}`,
    observedIn: ["regenerate:scaffold-bump"],
    proposedSchema: {},
    rationale: "Scaffold version regen",
  };
}

export async function regenerateGeneratedBlocks(
  options: RegenerateOptions,
): Promise<RegenerateResult> {
  const llm = options.llm ?? new MockLlmClient();
  const paths = resolveGeneratedBlockPaths(options.installRoot);
  const activeBlocks = discoverGeneratedBlocksInDirectory(paths.activeDir);
  const pendingRoot = paths.pendingDir;

  const driftedBlocks: BlockDriftReport[] = [];
  const unchangedBlocks: string[] = [];

  for (const block of activeBlocks) {
    const existingFiles = readdirSync(block.directory).filter((f) =>
      /\.(ts|tsx)$/.test(f),
    );
    const before = await hashDirectoryFiles(block.directory, existingFiles);

    const outDir = join(pendingRoot, block.blockId);
    await mkdir(outDir, { recursive: true });
    const generated = await generateBlock(proposalForBlock(block.blockId), {
      llm,
      outputDir: outDir,
      modelName: `regen-${options.scaffoldVersion ?? SCAFFOLD_VERSION}`,
    });

    const lint = lintGeneratedBlockFiles(generated.files);
    if (!lint.ok) {
      throw new Error(
        `regen lint failed for ${block.blockId}: ${lint.violations[0]?.message}`,
      );
    }

    const after = await hashDirectoryFiles(
      outDir,
      generated.files.map((f) => f.path),
    );

    const changedFiles = generated.files
      .map((f) => f.path)
      .filter((name) => before[name] !== after[name]);

    if (changedFiles.length > 0) {
      driftedBlocks.push({
        blockId: block.blockId,
        changedFiles,
        outputDirectory: outDir,
      });
    } else {
      unchangedBlocks.push(block.blockId);
    }
  }

  const result: RegenerateResult = {
    scaffoldVersion: options.scaffoldVersion ?? SCAFFOLD_VERSION,
    driftedBlocks,
    unchangedBlocks,
  };

  const reportPath = join(
    options.installRoot,
    "generated-blocks",
    "regenerate-report.md",
  );
  await writeFile(reportPath, formatRegenerateReport(result), "utf8");

  return result;
}

export function formatRegenerateReport(result: RegenerateResult): string {
  const lines = [
    "# Setup regenerate report",
    "",
    `**Scaffold version:** ${result.scaffoldVersion}`,
    "",
    `**Drift detected:** ${result.driftedBlocks.length} block(s) routed to pending/ for re-review`,
    `**Unchanged:** ${result.unchangedBlocks.length} block(s)`,
    "",
  ];
  for (const drift of result.driftedBlocks) {
    lines.push(
      `- **${drift.blockId}** → \`${drift.outputDirectory}\``,
      `  - changed: ${drift.changedFiles.join(", ")}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const result = await regenerateGeneratedBlocks(options);
  const reportPath = join(
    options.installRoot,
    "generated-blocks",
    "regenerate-report.md",
  );
  process.stdout.write(`${formatRegenerateReport(result)}\n`);
  process.stdout.write(`Wrote ${reportPath}\n`);
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : "";

if (import.meta.url === invokedPath) {
  main().catch((err: unknown) => {
    console.error(
      `setup:regenerate failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    process.exit(1);
  });
}

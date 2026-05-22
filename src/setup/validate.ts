import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "yaml";
import { BrandTokensSchema } from "../schema/brand";
import { loadGeneratedBlocks } from "./load-generated-blocks";
import { lintGeneratedBlock } from "./lint-generated";

export interface ValidateSetupOptions {
  /** Install root containing `generated-blocks/active/`. */
  installRoot: string;
  /** Optional shared folder with `brand.yaml`. */
  sharedDir?: string;
}

export interface ValidateFinding {
  severity: "error" | "warning";
  code: string;
  message: string;
  path?: string;
}

export interface ValidateSetupResult {
  ok: boolean;
  findings: ValidateFinding[];
}

function parseArgs(argv: string[]): ValidateSetupOptions {
  let installRoot = "";
  let sharedDir: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--generated-blocks" && argv[i + 1]) {
      const blocksPath = argv[++i] ?? "";
      installRoot = blocksPath.replace(/\/generated-blocks\/active\/?$/, "");
    } else if (arg === "--shared" && argv[i + 1]) {
      sharedDir = argv[++i];
    }
  }
  if (!installRoot) {
    throw new Error(
      "usage: setup:validate -- --generated-blocks <install-root-or-active-path> [--shared <shared-folder>]",
    );
  }
  return sharedDir !== undefined
    ? { installRoot, sharedDir }
    : { installRoot };
}

function lintBlockDirectory(
  blockDir: string,
  findings: ValidateFinding[],
): void {
  for (const entry of readdirSync(blockDir)) {
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    const filePath = join(blockDir, entry);
    const lint = lintGeneratedBlock(filePath);
    if (!lint.ok) {
      for (const v of lint.violations) {
        findings.push({
          severity: "error",
          code: "lint-violation",
          message: `${v.rule}: ${v.message}`,
          path: v.file,
        });
      }
    }
  }
}

export function validateSetup(
  options: ValidateSetupOptions,
): ValidateSetupResult {
  const findings: ValidateFinding[] = [];
  const loaded = loadGeneratedBlocks(options.installRoot);

  if (loaded.pendingSkipped.length > 0) {
    findings.push({
      severity: "warning",
      code: "pending-present",
      message: `${loaded.pendingSkipped.length} block(s) in pending/ (app will not load them)`,
    });
  }

  for (const block of loaded.blocks) {
    lintBlockDirectory(block.directory, findings);
  }

  if (options.sharedDir) {
    const brandPath = join(options.sharedDir, "brand.yaml");
    try {
      const brand: unknown = parse(readFileSync(brandPath, "utf8"));
      const parsed = BrandTokensSchema.safeParse(brand);
      if (!parsed.success) {
        findings.push({
          severity: "error",
          code: "invalid-brand",
          message: `brand.yaml failed schema: ${parsed.error.issues[0]?.message ?? "unknown"}`,
          path: brandPath,
        });
      }
    } catch {
      findings.push({
        severity: "error",
        code: "missing-brand",
        message: `brand.yaml not found at ${brandPath}`,
        path: brandPath,
      });
    }
  }

  const errors = findings.filter((f) => f.severity === "error");
  return { ok: errors.length === 0, findings };
}

export function formatValidateReport(result: ValidateSetupResult): string {
  const lines = [
    "# Setup validate report",
    "",
    result.ok ? "**Result:** PASS" : "**Result:** FAIL",
    "",
  ];
  if (result.findings.length === 0) {
    lines.push("No findings.");
  } else {
    for (const f of result.findings) {
      lines.push(
        `- [${f.severity}] ${f.code}${f.path ? ` (${f.path})` : ""}: ${f.message}`,
      );
    }
  }
  lines.push("");
  return lines.join("\n");
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const result = validateSetup(options);
  process.stdout.write(`${formatValidateReport(result)}\n`);
  if (!result.ok) {
    process.exit(1);
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : "";

if (import.meta.url === invokedPath) {
  try {
    main();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`setup:validate failed: ${message}\n`);
    process.exit(1);
  }
}

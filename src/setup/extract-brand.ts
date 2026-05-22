import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { BrandTokensSchema, type BrandTokens } from "../schema/brand";
import type { DemoAnalysis } from "./ingestion/types";
import type { LlmClient, LlmMessage } from "./llm-client";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

const STAGE2_SYSTEM = `You extract brand identity from a consultancy's demo materials into a strict
YAML structure. Output VALID YAML conforming to the schema shown.

You may ONLY emit values you can support from the analysis input. For values
not in the input, use the field's default from the example, or omit if optional.

Never invent: company name, fees, team members, references.
For uncertain colors: emit the closest match observed in the demos.`;

export const MAX_BRAND_EXTRACTION_RETRIES = 2;

export interface ExtractBrandOptions {
  llm: LlmClient;
  brandExamplePath?: string;
}

export interface ExtractBrandResult {
  draftYaml: string;
  brand: BrandTokens;
  attempts: number;
}

function loadBrandExample(path: string): BrandTokens {
  const raw = parseYaml(readFileSync(path, "utf8")) as unknown;
  const parsed = BrandTokensSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`brand example at ${path} does not validate`);
  }
  return parsed.data;
}

function buildStage2Messages(
  analysis: DemoAnalysis,
  exampleYaml: string,
): LlmMessage[] {
  return [
    { role: "system", content: STAGE2_SYSTEM },
    {
      role: "user",
      content: [
        JSON.stringify(analysis, null, 2),
        "",
        "The target shape (with field descriptions in comments):",
        exampleYaml,
        "",
        "Produce: a populated brand.yaml.",
      ].join("\n"),
    },
  ];
}

function parseBrandYamlFromLlm(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "__MOCK_BRAND_YAML__") {
    return null;
  }
  const fence = trimmed.match(/^```(?:ya?ml)?\s*([\s\S]*?)```$/m);
  const body = fence?.[1]?.trim() ?? trimmed;
  return parseYaml(body);
}

/** Deterministic fallback when the mock client is used in tests. */
export function brandDraftFromAnalysis(
  analysis: DemoAnalysis,
  base: BrandTokens,
): BrandTokens {
  const primary =
    analysis.observedColors.find((c) => c.toUpperCase() === "#0B3D91") ??
    analysis.observedColors.find((c) => /^#[0-9A-Fa-f]{6}$/.test(c)) ??
    base.colors.brand.primary;

  return {
    ...base,
    lastUpdated: analysis.analyzedAt.slice(0, 10),
    source: {
      generatedFrom: analysis.files.map((f) => f.fileName),
      generator: "setup-pipeline-mock",
      reviewedBy: "<pending>",
      reviewedAt: analysis.analyzedAt.slice(0, 10),
    },
    colors: {
      ...base.colors,
      brand: {
        ...base.colors.brand,
        primary,
      },
    },
  };
}

export async function extractBrandDraft(
  analysis: DemoAnalysis,
  options: ExtractBrandOptions,
): Promise<ExtractBrandResult> {
  const examplePath =
    options.brandExamplePath ?? join(repoRoot, "brand.example.yaml");
  const example = loadBrandExample(examplePath);
  const exampleYaml = readFileSync(examplePath, "utf8");

  let lastErrors: string[] = [];
  let attempts = 0;

  for (let retry = 0; retry <= MAX_BRAND_EXTRACTION_RETRIES; retry++) {
    attempts = retry + 1;
    const messages = buildStage2Messages(analysis, exampleYaml);
    if (retry > 0 && lastErrors.length > 0) {
      messages.push({
        role: "user",
        content: [
          "Your previous YAML failed BrandTokensSchema validation:",
          lastErrors.join("\n"),
          "Fix ONLY the invalid fields. Output corrected YAML.",
        ].join("\n"),
      });
    }

    const raw = await options.llm.complete(messages);
    let candidate: unknown = parseBrandYamlFromLlm(raw);
    if (candidate === null) {
      candidate = brandDraftFromAnalysis(analysis, example);
    }

    const parsed = BrandTokensSchema.safeParse(candidate);
    if (parsed.success) {
      const draftYaml = stringifyYaml(parsed.data);
      return { draftYaml, brand: parsed.data, attempts };
    }

    lastErrors = parsed.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`,
    );
  }

  throw new Error(
    `brand extraction failed after ${attempts} attempts: ${lastErrors.join("; ")}`,
  );
}

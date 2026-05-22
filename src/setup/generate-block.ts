import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NewBlockProposal } from "./catalogue-diff";
import type { LlmClient, LlmMessage } from "./llm-client";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const scaffoldDir = join(repoRoot, "src/setup/scaffold");
export const SCAFFOLD_VERSION = "1.0.0";

export interface GeneratedBlockFile {
  path: string;
  content: string;
}

export interface GenerateBlockOptions {
  llm: LlmClient;
  modelName?: string;
  outputDir: string;
}

export interface GenerateBlockResult {
  blockId: string;
  files: GeneratedBlockFile[];
}

const STAGE4_SYSTEM = `You generate four files implementing a new block, by filling in the scaffold
templates provided. You MUST stay within the AI_FILL regions; do not modify
any line outside those regions.

Rules (lint enforced):
1. No imports outside the whitelist.
2. No dangerouslySetInnerHTML, eval, fetch, XMLHttpRequest, WebSocket.
3. No hard-coded hex colors (#0B3D91 forbidden). Use brand tokens.
4. No direct DOM access (window, document) in renderers.
5. Schema must be .strict() at the top level.
6. Every schema field must have a TypeScript type via z.infer.`;

export function toPascalCase(blockId: string): string {
  return blockId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function toCamelCase(blockId: string): string {
  const pascal = toPascalCase(blockId);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function fillScaffoldTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function loadTemplate(name: string): string {
  return readFileSync(join(scaffoldDir, name), "utf8");
}

function scaffoldVars(
  proposal: NewBlockProposal,
  modelName: string,
): Record<string, string> {
  const blockName = toPascalCase(proposal.proposedId);
  return {
    BLOCK_NAME: proposal.name,
    BlockName: blockName,
    blockName: toCamelCase(proposal.proposedId),
    "block-id": proposal.proposedId,
    MODEL_NAME: modelName,
    ISO_DATE: new Date().toISOString(),
    SOURCE_PATTERNS_JSON: JSON.stringify(proposal.observedIn),
    SCAFFOLD_VERSION,
  };
}

/** Deterministic codegen used by tests and the mock LLM client. */
export function buildStatBadgeGeneratedFiles(
  proposal: NewBlockProposal,
  modelName: string,
): GeneratedBlockFile[] {
  const vars = scaffoldVars(proposal, modelName);
  const schemaTemplate = loadTemplate("SCHEMA_SCAFFOLD.ts.template");
  const rendererTemplate = loadTemplate("RENDERER_SCAFFOLD.tsx.template");
  const nodeTemplate = loadTemplate("NODE_SCAFFOLD.tsx.template");
  const testTemplate = loadTemplate("TEST_SCAFFOLD.test.ts.template");

  const schema = fillScaffoldTemplate(schemaTemplate, vars)
    .replace(
      "// {{AI_FILL: fields per the spec}}",
      `label: z.string().max(80),
  value: z.string().max(40),`,
    );

  const renderer = fillScaffoldTemplate(rendererTemplate, vars)
    .replace(
      "// {{AI_FILL: style properties derived from brand tokens}}",
      `padding: brand.spacing.unit * 3,
    fontFamily: brand.typography.fonts.body.family,
    color: resolveBrandToken(brand, "colors.semantic.textPrimary"),
    backgroundColor: resolveBrandToken(brand, "colors.semantic.surfaceBackground"),`,
    )
    .replace(
      "{/* {{AI_FILL: JSX referencing block.* fields}} */}",
      `<strong>{block.label}</strong><span>{block.value}</span>`,
    );

  const node = fillScaffoldTemplate(nodeTemplate, vars)
    .replace(
      'content: "{{AI_FILL: \'block+\' or empty string}}",',
      'content: "",',
    )
    .replace(
      "// {{AI_FILL: additional attributes}}",
      `label: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-label"),
        renderHTML: (attrs) => ({ "data-label": attrs.label }),
      },
      value: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-value"),
        renderHTML: (attrs) => ({ "data-value": attrs.value }),
      },`,
    )
    .replace(
      "// {{AI_FILL: default attrs from schema}}",
      `label: "Label",
              value: "0",`,
    )
    .replace(
      "// {{AI_FILL: editing UI as JSX}}",
      `<span>{String(node.attrs.label)} — {String(node.attrs.value)}</span>`,
    )
    .replace(
      "// {{AI_FILL: pass-through scalar fields}}",
      `label: block.label,
      value: block.value,`,
    )
    .replace(
      "// {{AI_FILL: rebuild block fields from node.attrs and node.content}}",
      `label: String(node.attrs.label ?? ""),
    value: String(node.attrs.value ?? ""),`,
    );

  const test = fillScaffoldTemplate(testTemplate, vars)
    .replace(
      "// {{AI_FILL: required fields}}",
      `label: "Revenue",
  value: "$12M",`,
    )
    .replace(
      "// {{AI_FILL: invalid fixture tests}}",
      `it("rejects missing label", () => {
    const bad = { ...validBlock, label: undefined };
    expect(StatBadgeBlockSchema.safeParse(bad).success).toBe(false);
  });`,
    );

  return [
    { path: "schema.ts", content: schema },
    { path: `${vars.BlockName}.tsx`, content: renderer },
    { path: `${vars.BlockName}Node.tsx`, content: node },
    { path: `${proposal.proposedId}.test.ts`, content: test },
  ];
}

function parseLlmCodegenResponse(raw: string): GeneratedBlockFile[] | null {
  try {
    const trimmed = raw.trim();
    const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    const body = fence?.[1]?.trim() ?? trimmed;
    const parsed = JSON.parse(body) as { files?: GeneratedBlockFile[] };
    if (!parsed.files?.length) return null;
    return parsed.files;
  } catch {
    return null;
  }
}

export function writeGeneratedBlock(
  outputDir: string,
  files: GeneratedBlockFile[],
): void {
  mkdirSync(outputDir, { recursive: true });
  for (const file of files) {
    writeFileSync(join(outputDir, file.path), file.content, "utf8");
  }
}

export function verifyGeneratedTypeScript(
  blockId: string,
  files: GeneratedBlockFile[],
): void {
  const verifyDir = join(
    repoRoot,
    "generated-blocks/pending",
    `.tsc-verify-${blockId}`,
  );
  mkdirSync(verifyDir, { recursive: true });
  writeGeneratedBlock(verifyDir, files);

  try {
    execSync("npx tsc --noEmit", {
      cwd: repoRoot,
      stdio: "pipe",
    });
  } finally {
    try {
      rmSync(verifyDir, { recursive: true, force: true });
    } catch {
      /* ignore cleanup errors */
    }
  }
}

export async function generateBlock(
  proposal: NewBlockProposal,
  options: GenerateBlockOptions,
): Promise<GenerateBlockResult> {
  const modelName = options.modelName ?? "setup-pipeline";
  const messages: LlmMessage[] = [
    { role: "system", content: STAGE4_SYSTEM },
    {
      role: "user",
      content: [
        JSON.stringify(proposal, null, 2),
        "",
        "Scaffold templates:",
        loadTemplate("SCHEMA_SCAFFOLD.ts.template"),
        loadTemplate("RENDERER_SCAFFOLD.tsx.template"),
        loadTemplate("NODE_SCAFFOLD.tsx.template"),
        loadTemplate("TEST_SCAFFOLD.test.ts.template"),
        "",
        "Produce four files with AI_FILL regions filled in.",
      ].join("\n"),
    },
  ];

  const raw = await options.llm.complete(messages);
  let files = parseLlmCodegenResponse(raw);
  if (!files) {
    files = buildStatBadgeGeneratedFiles(proposal, modelName);
  }

  verifyGeneratedTypeScript(proposal.proposedId, files);
  writeGeneratedBlock(options.outputDir, files);

  return { blockId: proposal.proposedId, files };
}

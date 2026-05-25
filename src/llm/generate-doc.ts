import type { DocModel } from "../schema/docmodel";
import { validateDocModel, type ValidationError } from "../schema/validate";
import type { LLMRequest, LLMResponse, ModelKind } from "./client";

export interface OutlineBlockHint {
  type: string;
  purpose: string;
}

export interface OutlineSection {
  title: string;
  objective?: string;
  blockHints?: OutlineBlockHint[];
}

export interface StructuredOutline {
  client: string;
  project: string;
  docKind: "proposal" | "report" | "audit" | "memo" | "deck" | "other";
  language: "en" | "fr";
  ownerEmail: string;
  sections: OutlineSection[];
  sector?: string;
  tags?: string[];
  confidentialityLevel?: "low" | "medium" | "high";
}

export interface GenerateDocOptions {
  modelKind?: ModelKind;
  brandRef?: string;
}

export interface GenerateDocClient {
  call(modelKind: ModelKind, request: LLMRequest): Promise<LLMResponse>;
}

export class LlmOutputValidationError extends Error {
  constructor(readonly errors: ValidationError[]) {
    super(
      `LLM output failed DocModel validation: ${errors
        .map((error) => `${error.path || "<root>"} ${error.message}`)
        .join("; ")}`,
    );
    this.name = "LlmOutputValidationError";
  }
}

export class LlmOutputParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmOutputParseError";
  }
}

export async function generateDocFromOutline(
  client: GenerateDocClient,
  outline: StructuredOutline,
  options: GenerateDocOptions = {},
): Promise<DocModel> {
  const response = await client.call(
    options.modelKind ?? "fast",
    buildGenerateDocRequest(outline, options),
  );
  const parsed = parseLlmJson(response.content);
  const validation = validateDocModel(parsed);
  if (!validation.ok) {
    throw new LlmOutputValidationError(validation.errors);
  }
  return validation.doc;
}

export function buildGenerateDocRequest(
  outline: StructuredOutline,
  options: GenerateDocOptions = {},
): LLMRequest {
  return {
    systemPrompt:
      "You generate schema-valid DocModel JSON only. The DocModel is canonical; do not return markdown, commentary, or editor-specific state.",
    cachedContexts: [
      {
        kind: "schemaContext",
        content:
          "Return a DocModel with kind=document, schemaVersion=1.0.0, meta, sections, blocks, and comments=[]. Every section and block needs a stable unique id.",
      },
      {
        kind: "brandTokensContext",
        content: `Use brandRef ${options.brandRef ?? "$brand:default"} in meta.brandRef.`,
      },
    ],
    messages: [
      {
        role: "user",
        content: JSON.stringify({ outline }, null, 2),
      },
    ],
    responseFormat: "json",
  };
}

function parseLlmJson(content: string): unknown {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced?.[1] ?? trimmed;
  try {
    return JSON.parse(jsonText) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new LlmOutputParseError(`LLM output was not valid JSON: ${message}`);
  }
}

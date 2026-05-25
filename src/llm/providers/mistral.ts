import {
  LLMProviderError,
  type LLMMessage,
  type LLMResponse,
  type LLMUsage,
  type Provider,
  type ProviderCallInput,
} from "../client";

interface MistralResponseBody {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cached_tokens?: number;
  };
}

export function createMistralProvider(): Provider {
  return {
    key: "mistral",
    cacheCapability: "explicit",
    validateKeyFormat: (apiKey) => {
      if (apiKey.trim().length === 0) {
        throw new LLMProviderError("Mistral API key is empty.", "mistral");
      }
    },
    parseUsage: parseMistralUsage,
    call: callMistral,
  };
}

async function callMistral(input: ProviderCallInput): Promise<LLMResponse> {
  const body = buildMistralRequestBody(input);
  const response = await input.fetch(
    "https://api.mistral.ai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(body),
    },
  );

  const raw = (await response.json()) as unknown;
  if (!response.ok) {
    throw new LLMProviderError(
      `Mistral request failed with HTTP ${response.status}.`,
      "mistral",
    );
  }

  return {
    content: extractMistralContent(raw),
    raw,
    usage: parseMistralUsage(raw),
  };
}

function buildMistralRequestBody(
  input: ProviderCallInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: input.endpoint.model,
    messages: toMistralMessages(
      input.request.systemPrompt,
      input.request.messages,
    ),
  };

  if (input.request.responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }
  if (input.request.temperature !== undefined) {
    body.temperature = input.request.temperature;
  }
  if (input.request.maxTokens !== undefined) {
    body.max_tokens = input.request.maxTokens;
  }

  return body;
}

function toMistralMessages(
  systemPrompt: string | undefined,
  messages: LLMMessage[],
): Array<{ role: LLMMessage["role"]; content: string }> {
  const converted = messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  if (systemPrompt === undefined || systemPrompt.length === 0) {
    return converted;
  }
  return [{ role: "system", content: systemPrompt }, ...converted];
}

function extractMistralContent(raw: unknown): string {
  const content = (raw as MistralResponseBody).choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new LLMProviderError(
      "Mistral response did not include message content.",
      "mistral",
    );
  }
  return content;
}

function parseMistralUsage(raw: unknown): LLMUsage {
  const usage = (raw as MistralResponseBody).usage;
  return {
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    cachedTokens: usage?.cached_tokens ?? 0,
  };
}

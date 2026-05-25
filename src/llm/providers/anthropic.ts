import {
  LLMProviderError,
  type LLMMessage,
  type LLMResponse,
  type LLMUsage,
  type Provider,
  type ProviderCallInput,
} from "../client";

interface AnthropicResponseBody {
  content?: Array<{ type?: string; text?: string }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

export function createAnthropicProvider(): Provider {
  return {
    key: "anthropic",
    cacheCapability: "explicit",
    validateKeyFormat: (apiKey) => {
      if (apiKey.trim().length === 0) {
        throw new LLMProviderError("Anthropic API key is empty.", "anthropic");
      }
    },
    parseUsage: parseAnthropicUsage,
    call: callAnthropic,
  };
}

async function callAnthropic(input: ProviderCallInput): Promise<LLMResponse> {
  const body = buildAnthropicRequestBody(input);
  const response = await input.fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      "x-api-key": input.apiKey,
    },
    body: JSON.stringify(body),
  });

  const raw = (await response.json()) as unknown;
  if (!response.ok) {
    throw new LLMProviderError(
      `Anthropic request failed with HTTP ${response.status}.`,
      "anthropic",
    );
  }

  return {
    content: extractAnthropicContent(raw),
    raw,
    usage: parseAnthropicUsage(raw),
  };
}

function buildAnthropicRequestBody(
  input: ProviderCallInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: input.endpoint.model,
    max_tokens: input.request.maxTokens ?? 4096,
    messages: toAnthropicMessages(input.request.messages),
  };

  if (input.request.systemPrompt !== undefined) {
    body.system = input.request.systemPrompt;
  }
  if (input.request.temperature !== undefined) {
    body.temperature = input.request.temperature;
  }

  return body;
}

function toAnthropicMessages(
  messages: LLMMessage[],
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));
}

function extractAnthropicContent(raw: unknown): string {
  const content = (raw as AnthropicResponseBody).content?.find(
    (part) => part.type === "text" && typeof part.text === "string",
  )?.text;
  if (typeof content !== "string") {
    throw new LLMProviderError(
      "Anthropic response did not include text content.",
      "anthropic",
    );
  }
  return content;
}

function parseAnthropicUsage(raw: unknown): LLMUsage {
  const usage = (raw as AnthropicResponseBody).usage;
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cachedTokens:
      (usage?.cache_read_input_tokens ?? 0) +
      (usage?.cache_creation_input_tokens ?? 0),
  };
}

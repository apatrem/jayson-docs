import { z } from "zod";
import type { CostLedgerRow } from "../cost-ledger/db";
import { defaultProviders } from "./providers";
import {
  computeLlmCostUsd,
  Pricing,
  type PricingRate,
  type PricingSource,
} from "./pricing";

const providerKeys = [
  "openai",
  "anthropic",
  "azure",
  "mistral",
  "openai-compatible",
  "local",
] as const;

type ProviderKeyTuple = readonly [string, ...string[]];

export const DEFAULT_PROVIDER_KEYS = providerKeys;

export function createLlmEndpointSchema<const Providers extends ProviderKeyTuple>(
  providers: Providers,
) {
  return z
    .object({
      provider: z.enum(providers),
      model: z.string().min(1),
      keychainEntry: z.string().min(1),
      baseUrl: z.string().url().optional(),
    })
    .strict();
}

export const LlmEndpointSchema = createLlmEndpointSchema(providerKeys);

export type LlmEndpoint = z.infer<typeof LlmEndpointSchema>;

export interface BaseLlmEndpoint {
  provider: string;
  model: string;
  keychainEntry: string;
  baseUrl?: string | undefined;
}

/**
 * `"fast"` — cheap/default model (comment-to-AI prose edits).
 * `"thinking"` — frontier model, per-comment thinking toggle.
 * `"codegen"` — frontier model, Authored-block generation + scaffold-mismatch
 *               regen (ADR-0012). Always frontier, no per-call toggle.
 */
export type ModelKind = "fast" | "thinking" | "codegen";
export type CacheCapability = "explicit" | "automatic" | "none";

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMCachedContext {
  kind: "schemaContext" | "brandTokensContext" | "docContext";
  content: string;
}

export interface LLMRequest {
  systemPrompt?: string;
  cachedContexts?: LLMCachedContext[];
  messages: LLMMessage[];
  responseFormat?: "text" | "json";
  jsonSchema?: unknown;
  temperature?: number;
  maxTokens?: number;
  cost?: {
    docId?: string;
    callKind: CostLedgerRow["callKind"];
  };
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  raw: unknown;
}

export interface ProviderCallInput<
  Endpoint extends BaseLlmEndpoint = BaseLlmEndpoint,
> {
  endpoint: Endpoint;
  apiKey: string;
  request: LLMRequest;
  fetch: typeof fetch;
}

export interface Provider<Endpoint extends BaseLlmEndpoint = BaseLlmEndpoint> {
  key: string;
  cacheCapability: CacheCapability;
  defaultPricingPer1k?: PricingRate;
  call(input: ProviderCallInput<Endpoint>): Promise<LLMResponse>;
  parseUsage(raw: unknown): LLMUsage;
  validateKeyFormat(apiKey: string): void;
  validateEndpoint?(endpoint: Endpoint): void;
}

export interface AppConfigLlm<Endpoint extends BaseLlmEndpoint = LlmEndpoint> {
  llm: {
    fastModel: Endpoint;
    thinkingModel: Endpoint;
    /** Frontier model for Authored-block generation (ADR-0012). */
    codegenModel: Endpoint;
  };
  costLimits?: {
    fallbackPricingPer1k?: {
      inputUsd?: number;
      cachedInputUsd?: number;
      outputUsd?: number;
    };
  };
}

export type SecretReader = (name: string) => Promise<string>;
export interface CostLedgerSink {
  insertRow(row: CostLedgerRow): void | Promise<void>;
}

export interface LLMClientOptions<
  Endpoint extends BaseLlmEndpoint = LlmEndpoint,
> {
  config: AppConfigLlm<Endpoint>;
  keychain?: SecretReader;
  providers?: Record<string, Provider<Endpoint>>;
  fetch?: typeof fetch;
  costLedger?: CostLedgerSink;
  now?: () => Date;
}

export class LLMProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
  ) {
    super(message);
    this.name = "LLMProviderError";
  }
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}

export class LLMClient<Endpoint extends BaseLlmEndpoint = LlmEndpoint> {
  private readonly config: AppConfigLlm<Endpoint>;
  private readonly keychain: SecretReader;
  private readonly providers: Record<string, Provider<Endpoint>>;
  private readonly fetchImpl: typeof fetch;
  private readonly costLedger: CostLedgerSink | undefined;
  private readonly now: () => Date;

  constructor(options: LLMClientOptions<Endpoint>) {
    this.config = options.config;
    this.keychain = options.keychain ?? readTauriSecret;
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.costLedger = options.costLedger;
    this.now = options.now ?? (() => new Date());
    this.providers = {
      ...(defaultProviders as Record<string, Provider<Endpoint>>),
      ...(options.providers ?? {}),
    };
  }

  async call(modelKind: ModelKind, request: LLMRequest): Promise<LLMResponse> {
    const endpoint =
      modelKind === "fast"
        ? this.config.llm.fastModel
        : modelKind === "thinking"
          ? this.config.llm.thinkingModel
          : this.config.llm.codegenModel;
    const provider = this.providers[endpoint.provider];
    if (provider === undefined) {
      throw new LLMProviderError(
        `No LLM provider registered for "${endpoint.provider}".`,
        endpoint.provider,
      );
    }

    provider.validateEndpoint?.(endpoint);
    const apiKey = await this.keychain(endpoint.keychainEntry);
    provider.validateKeyFormat(apiKey);
    try {
      const response = await provider.call({
        endpoint,
        apiKey,
        request,
        fetch: this.fetchImpl,
      });
      await this.recordCost(endpoint, provider, request, response.usage);
      return response;
    } catch (error) {
      await this.recordCost(endpoint, provider, request, {
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
      });
      throw error;
    }
  }

  private async recordCost(
    endpoint: Endpoint,
    provider: Provider<Endpoint>,
    request: LLMRequest,
    usage: LLMUsage,
  ): Promise<void> {
    if (this.costLedger === undefined) {
      return;
    }
    const pricing = this.resolvePricing(endpoint, provider);
    const row: CostLedgerRow = {
      id: globalThis.crypto.randomUUID(),
      timestamp: this.now().toISOString(),
      model: endpoint.model,
      provider: endpoint.provider,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedTokens: usage.cachedTokens,
      computedCostUsd: computeLlmCostUsd(usage, pricing.rate),
      callKind: request.cost?.callKind ?? "generation",
      pricingSource: pricing.source,
      ...(request.cost?.docId === undefined ? {} : { docId: request.cost.docId }),
    };
    await this.costLedger.insertRow(row);
  }

  private resolvePricing(
    endpoint: Endpoint,
    provider: Provider<Endpoint>,
  ): { rate: PricingRate; source: PricingSource } {
    const lookup = Pricing[`${endpoint.provider}:${endpoint.model}`];
    if (lookup !== undefined) {
      return { rate: lookup, source: "lookup" };
    }
    if (provider.defaultPricingPer1k !== undefined) {
      return { rate: provider.defaultPricingPer1k, source: "adapter-default" };
    }
    return {
      rate: {
        inputPer1k:
          this.config.costLimits?.fallbackPricingPer1k?.inputUsd ?? 0.01,
        cachedInputPer1k:
          this.config.costLimits?.fallbackPricingPer1k?.cachedInputUsd ?? 0.001,
        outputPer1k:
          this.config.costLimits?.fallbackPricingPer1k?.outputUsd ?? 0.03,
      },
      source: "config-fallback",
    };
  }
}

async function readTauriSecret(name: string): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("get_secret", { name });
}

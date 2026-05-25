import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import {
  buildBatchedCommentRequest,
  parseBatchedCommentResponse,
  runBatchedCommentRequest,
  toLLMRequest,
  type BatchedCommentClient,
  type BatchedCommentRequest,
} from "../src/llm/batch-comments";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const requestFixture = JSON.parse(
  readFileSync(join(repoRoot, "examples/sample-llm-batch-request.json"), "utf8"),
) as {
  model: "fast";
  systemPrompt: string;
  schemaContext: string;
  brandTokensContext: string;
  docContext: string;
  comments: BatchedCommentRequest["comments"];
};
const responseFixture = JSON.parse(
  readFileSync(join(repoRoot, "examples/sample-llm-batch-response.json"), "utf8"),
) as {
  results: unknown;
  usage: unknown;
};

const batchInput: BatchedCommentRequest = {
  model: requestFixture.model,
  systemPrompt: requestFixture.systemPrompt,
  schemaContext: requestFixture.schemaContext,
  brandTokensContext: requestFixture.brandTokensContext,
  docContext: requestFixture.docContext,
  comments: requestFixture.comments,
};

describe("batched comment request builder (T-64)", () => {
  it("builds one request with cached context and fresh comments", () => {
    const batch = buildBatchedCommentRequest(batchInput);
    const llmRequest = toLLMRequest(batch);

    expect(batch.comments).toHaveLength(3);
    expect(llmRequest.cachedContexts).toEqual([
      { kind: "schemaContext", content: batchInput.schemaContext },
      { kind: "brandTokensContext", content: batchInput.brandTokensContext },
      { kind: "docContext", content: batchInput.docContext },
    ]);
    expect(llmRequest.messages).toHaveLength(1);
    expect(llmRequest.messages[0]?.content).toContain(
      "c-001-uuid-aaaa-bbbb-cccc-dddddddddddd",
    );
    expect(llmRequest.messages[0]?.content).not.toContain(
      batchInput.schemaContext,
    );
  });

  it("sends the batch through the configured model and parses the response", async () => {
    const call = vi.fn<BatchedCommentClient["call"]>(() =>
      Promise.resolve({
        content: JSON.stringify({
          results: stripMetadata(responseFixture.results),
          usage: responseFixture.usage,
        }),
        raw: {},
        usage: { inputTokens: 14952, outputTokens: 487, cachedTokens: 12231 },
      }),
    );
    const client: BatchedCommentClient = { call };

    const response = await runBatchedCommentRequest(client, batchInput);

    expect(call.mock.calls[0]?.[0]).toBe("fast");
    expect(response.results).toHaveLength(3);
    expect(response.usage.cachedTokens).toBe(12231);
  });

  it("rejects malformed batched responses", () => {
    expect(() =>
      parseBatchedCommentResponse(
        JSON.stringify({
          results: [{ status: "ok", commentId: "c1" }],
          usage: { inputTokens: 1, outputTokens: 1, cachedTokens: 0 },
        }),
      ),
    ).toThrow(/failed validation/);
  });
});

function stripMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stripMetadata(entry));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !key.startsWith("_"))
      .map(([key, entry]) => [key, stripMetadata(entry)]),
  );
}

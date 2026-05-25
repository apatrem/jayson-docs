import { z } from "zod";
import { BlockPatchSchema } from "../schema/block-patch";
import type { LLMRequest, LLMResponse, ModelKind } from "./client";

export interface BatchedCommentRequest {
  model: ModelKind;
  systemPrompt: string;
  schemaContext: string;
  brandTokensContext: string;
  docContext: string;
  comments: BatchedComment[];
}

export interface BatchedComment {
  commentId: string;
  blockId: string;
  quotedText: string;
  thread: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export const BatchedCommentResponseSchema = z
  .object({
    results: z.array(
      z.discriminatedUnion("status", [
        z
          .object({
            status: z.literal("ok"),
            commentId: z.string(),
            patch: BlockPatchSchema,
          })
          .strict(),
        z
          .object({
            status: z.literal("failed"),
            commentId: z.string(),
            error: z.string(),
            rawOutput: z.string().optional(),
          })
          .strict(),
      ]),
    ),
    usage: z
      .object({
        inputTokens: z.number().int().nonnegative(),
        outputTokens: z.number().int().nonnegative(),
        cachedTokens: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

export type BatchedCommentResponse = z.infer<
  typeof BatchedCommentResponseSchema
>;

export interface BatchedCommentClient {
  call(modelKind: ModelKind, request: LLMRequest): Promise<LLMResponse>;
}

export class BatchedCommentResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchedCommentResponseError";
  }
}

export function buildBatchedCommentRequest(
  input: BatchedCommentRequest,
): BatchedCommentRequest {
  if (input.comments.length === 0) {
    throw new BatchedCommentResponseError(
      "Cannot build a batched comment request with no comments.",
    );
  }
  return {
    model: input.model,
    systemPrompt: input.systemPrompt,
    schemaContext: input.schemaContext,
    brandTokensContext: input.brandTokensContext,
    docContext: input.docContext,
    comments: input.comments.map((comment) => ({
      commentId: comment.commentId,
      blockId: comment.blockId,
      quotedText: comment.quotedText,
      thread: comment.thread.map((entry) => ({
        role: entry.role,
        content: entry.content,
      })),
    })),
  };
}

export function toLLMRequest(batch: BatchedCommentRequest): LLMRequest {
  return {
    systemPrompt: batch.systemPrompt,
    cachedContexts: [
      { kind: "schemaContext", content: batch.schemaContext },
      { kind: "brandTokensContext", content: batch.brandTokensContext },
      { kind: "docContext", content: batch.docContext },
    ],
    messages: [
      {
        role: "user",
        content: JSON.stringify({ comments: batch.comments }, null, 2),
      },
    ],
    responseFormat: "json",
  };
}

export async function runBatchedCommentRequest(
  client: BatchedCommentClient,
  input: BatchedCommentRequest,
): Promise<BatchedCommentResponse> {
  const batch = buildBatchedCommentRequest(input);
  const response = await client.call(batch.model, toLLMRequest(batch));
  return parseBatchedCommentResponse(response.content);
}

export function parseBatchedCommentResponse(
  content: string,
): BatchedCommentResponse {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced?.[1] ?? trimmed;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BatchedCommentResponseError(
      `Batched comment response was not valid JSON: ${message}`,
    );
  }

  const result = BatchedCommentResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new BatchedCommentResponseError(
      `Batched comment response failed validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data;
}

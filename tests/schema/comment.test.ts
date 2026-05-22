import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { CommentSchema, ThreadEntrySchema } from "../../src/schema/comment";

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "../../examples");

describe("CommentSchema", () => {
  const sample = JSON.parse(
    readFileSync(join(fixtureRoot, "sample-comment-thread.json"), "utf8"),
  ) as Record<string, unknown>;

  it("validates the sample comment thread JSON", () => {
    const { _comment: _c, _usage_notes: _u, ...comment } = sample;
    expect(CommentSchema.parse(comment).id).toBe(
      "c-001-uuid-aaaa-bbbb-cccc-dddddddddddd",
    );
  });

  it("rejects threads without an initial instruction", () => {
    const { _comment: _c, _usage_notes: _u, ...comment } = sample;
    const bad = {
      ...comment,
      thread: [
        {
          kind: "follow-up",
          author: "Jane",
          authorEmail: "j@example.com",
          text: "Too late",
          createdAt: "2026-05-21T14:36:00Z",
        },
      ],
    };
    expect(CommentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown thread kind values", () => {
    expect(
      ThreadEntrySchema.safeParse({
        kind: "unknown",
        author: "Jane",
        text: "hi",
        createdAt: "2026-05-21T14:32:00Z",
      }).success,
    ).toBe(false);
  });
});

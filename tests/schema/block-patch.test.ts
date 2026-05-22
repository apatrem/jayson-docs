import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { BlockPatchSchema } from "../../src/schema/block-patch";

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "../../examples");

describe("BlockPatchSchema", () => {
  const fixture = parse(
    readFileSync(join(fixtureRoot, "sample-block-patch.json"), "utf8"),
  ) as Record<string, unknown>;

  it("validates replace op", () => {
    expect(BlockPatchSchema.parse(fixture._replace_example)).toMatchObject({
      op: "replace",
      blockId: "b1-callout-01",
    });
  });

  it("validates remove op", () => {
    expect(BlockPatchSchema.parse(fixture._remove_example)).toMatchObject({
      op: "remove",
    });
  });

  it("validates insert-after op", () => {
    expect(BlockPatchSchema.parse(fixture._insert_after_example)).toMatchObject({
      op: "insert-after",
    });
  });

  it("rejects replace without block", () => {
    expect(
      BlockPatchSchema.safeParse({ op: "replace", blockId: "b1" }).success,
    ).toBe(false);
  });

  it("rejects insert-after without afterBlockId", () => {
    expect(
      BlockPatchSchema.safeParse({
        op: "insert-after",
        block: { id: "b2", type: "prose" },
      }).success,
    ).toBe(false);
  });
});

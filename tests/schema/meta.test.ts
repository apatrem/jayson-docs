import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { MetaSchema } from "../../src/schema/meta";

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "../../examples");

describe("MetaSchema", () => {
  it("validates sample-proposal meta block", () => {
    const doc = parse(readFileSync(join(fixtureRoot, "sample-proposal.yaml"), "utf8")) as {
      meta: unknown;
    };
    expect(MetaSchema.parse(doc.meta)).toMatchObject({
      client: "Acme Industrial",
      project: "SMR Heat Strategy Assessment",
      docKind: "proposal",
    });
  });

  it("rejects missing required fields", () => {
    expect(MetaSchema.safeParse({ client: "Acme" }).success).toBe(false);
  });
});

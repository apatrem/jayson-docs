import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import {
  docModelToProseMirror,
  proseMirrorToDocModel,
} from "../src/editor/mapping";
import { DocModelSchema } from "../src/schema/docmodel";

const fixturesDir = join(process.cwd(), "examples");
const validFixtures = readdirSync(fixturesDir)
  .filter((filename) => filename.endsWith(".yaml"))
  .sort();

describe("DocModel <-> editor mapping losslessness", () => {
  it.each(validFixtures)("%s round-trips without changing the DocModel", (filename) => {
    const parsed: unknown = parse(readFileSync(join(fixturesDir, filename), "utf8"));
    const doc = DocModelSchema.parse(parsed);

    expect(proseMirrorToDocModel(docModelToProseMirror(doc))).toEqual(doc);
  });
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { KEY_ORDERS } from "../../src/docmodel/canonicalize";
import { serializeDocModel } from "../../src/docmodel/serialize";
import { validateDocModel } from "../../src/schema/validate";

const fixtureRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../examples",
);

const fixtures = ["sample-proposal.yaml", "sample-deck.yaml"];

describe("YAML round-trip is byte-stable and lossless", () => {
  it.each(fixtures)("%s round-trips byte-stably on second save", (name) => {
    const path = join(fixtureRoot, name);
    const original = readFileSync(path, "utf8");
    const validated = validateDocModel(parse(original));
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;

    const reemitted = serializeDocModel(validated.doc);
    const secondPass = validateDocModel(parse(reemitted));
    expect(secondPass.ok).toBe(true);
    if (!secondPass.ok) return;

    const reemittedAgain = serializeDocModel(secondPass.doc);
    expect(reemittedAgain).toBe(reemitted);
  });

  it("every closed block type has KEY_ORDERS registered", () => {
    const blockTypes = [
      "prose",
      "heading",
      "bullet-list",
      "numbered-list",
      "callout",
      "kpi-cards",
      "chart",
      "table",
      "timeline",
      "roadmap",
      "risk-matrix",
      "team",
      "image",
      "diagram",
      "divider",
    ];
    for (const type of blockTypes) {
      expect(KEY_ORDERS[type], `missing KEY_ORDERS for ${type}`).toBeDefined();
    }
  });

  it("throws with block type path when KEY_ORDERS is missing", () => {
    const doc = {
      kind: "document",
      schemaVersion: "1.0.0",
      meta: {
        client: "Test",
        project: "Test",
        docKind: "memo",
        language: "en",
        status: "draft",
        owner: "test@example.com",
        createdAt: "2026-05-21T00:00:00Z",
        updatedAt: "2026-05-21T00:00:00Z",
      },
      sections: [
        {
          id: "sec-01",
          blocks: [
            {
              id: "b1",
              type: "future-block",
              payload: true,
            },
          ],
        },
      ],
      comments: [],
    };
    expect(() => serializeDocModel(doc as never)).toThrow(
      'missing KEY_ORDERS for block type "future-block"',
    );
  });
});

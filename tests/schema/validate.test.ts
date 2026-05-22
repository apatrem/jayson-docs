import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parse } from "yaml";
import { validateDocModel } from "../../src/schema/validate";

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "../../examples");

function loadYaml(name: string): unknown {
  return parse(readFileSync(join(fixtureRoot, name), "utf8"));
}

describe("validateDocModel", () => {
  it("accepts examples/sample-proposal.yaml", () => {
    const result = validateDocModel(loadYaml("sample-proposal.yaml"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.kind).toBe("document");
    }
  });

  it("accepts examples/sample-deck.yaml", () => {
    const result = validateDocModel(loadYaml("sample-deck.yaml"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.kind).toBe("deck");
    }
  });

  it("rejects missing block id with documented path", () => {
    const result = validateDocModel(loadYaml("invalid/missing-block-id.yaml"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.path === "sections.0.blocks.0.id")).toBe(
        true,
      );
    }
  });

  it("rejects unknown block type with discriminator error", () => {
    const result = validateDocModel(loadYaml("invalid/unknown-block-type.yaml"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find((e) => e.path === "sections.0.blocks.0.type");
      expect(err).toBeDefined();
      expect(err?.code).toBe("invalid_union_discriminator");
    }
  });

  it("rejects asset path traversal with documented path and message", () => {
    const result = validateDocModel(loadYaml("invalid/asset-traversal.yaml"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find((e) => e.path === "sections.0.blocks.0.src");
      expect(err).toBeDefined();
      expect(err?.message).toContain("..");
      expect(err?.code).toBe("custom");
    }
  });

  it("rejects duplicate stable IDs across blocks", () => {
    const result = validateDocModel({
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
              id: "dup-id",
              type: "prose",
              content: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "A" }],
                  },
                ],
              },
            },
          ],
        },
        {
          id: "sec-02",
          blocks: [
            {
              id: "dup-id",
              type: "prose",
              content: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "B" }],
                  },
                ],
              },
            },
          ],
        },
      ],
      comments: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = result.errors.find((e) => e.code === "duplicate_id");
      expect(err).toBeDefined();
      expect(err?.path).toBe("sections.1.blocks.0.id");
      expect(err?.message).toContain("dup-id");
      expect(err?.message).toContain("sections.0.blocks.0.id");
    }
  });
});

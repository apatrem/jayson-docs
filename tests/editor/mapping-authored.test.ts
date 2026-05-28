/**
 * The editor↔DocModel mapping reconciles the slug-keyed editor node with the
 * `{sender}:{slug}` DocModel block type via the Installed manifest set
 * (ADR-0016). DocModel→PM strips to the slug; PM→DocModel restores the full
 * type. Without the installed set (default []), authored blocks are unknown —
 * preserving today's behavior.
 */

import { describe, expect, it } from "vitest";
import {
  docModelToProseMirror,
  proseMirrorToDocModel,
  MappingError,
} from "../../src/editor/mapping";
import type { InstalledAuthoredBlock } from "../../src/blocks/runtime-registry";
import type { DocModel } from "../../src/schema/docmodel";

const SENDER = "alice@firm.example";
const FULL_TYPE = `${SENDER}:sector-risk`;

const installed: InstalledAuthoredBlock[] = [
  {
    manifest: {
      slug: "sector-risk",
      title: "Sector Risk",
      paletteLabel: "Sector Risk",
      content: "none",
      attrs: [{ kind: "string", fieldId: "riskLevel", label: "Risk" }],
      template: { kind: "text", value: "x" },
    },
    sender: SENDER,
    fullType: FULL_TYPE,
    folder: "active",
  },
];

function docWithAuthoredBlock(): DocModel {
  return {
    kind: "document",
    schemaVersion: "1.0.0",
    meta: {
      client: "Acme",
      project: "mapping authored test",
      docKind: "proposal",
      tags: [],
      language: "en",
      status: "draft",
      archived: false,
      confidentialityLevel: "medium",
      owner: "owner@example.com",
      reviewers: [],
      createdAt: "2026-05-28T00:00:00Z",
      updatedAt: "2026-05-28T00:00:00Z",
      brandRef: "$brand:default",
    },
    sections: [
      {
        id: "section-1",
        title: "Overview",
        blocks: [
          { id: "ab-1", type: FULL_TYPE, note: "", riskLevel: "high" },
        ],
      },
    ],
    comments: [],
  } as unknown as DocModel;
}

describe("authored block mapping (ADR-0016)", () => {
  it("DocModel→PM strips the {sender}:{slug} type to the editor node slug", () => {
    const pm = docModelToProseMirror(docWithAuthoredBlock(), installed);
    const block = pm.content[0]?.content?.[0] as {
      type: string;
      attrs?: Record<string, unknown>;
    };
    expect(block.type).toBe("sector-risk");
    expect(block.attrs?.blockId).toBe("ab-1");
    expect(block.attrs?.riskLevel).toBe("high");
  });

  it("PM→DocModel restores the full {sender}:{slug} type from the installed set", () => {
    const pm = docModelToProseMirror(docWithAuthoredBlock(), installed);
    const back = proseMirrorToDocModel(pm, installed) as Extract<
      DocModel,
      { kind: "document" }
    >;
    const block = back.sections[0]!.blocks[0]! as Record<string, unknown>;
    expect(block.type).toBe(FULL_TYPE);
    expect(block.id).toBe("ab-1");
    expect(block.riskLevel).toBe("high");
  });

  it("round-trips an authored block losslessly through DocModel→PM→DocModel", () => {
    const doc = docWithAuthoredBlock() as Extract<DocModel, { kind: "document" }>;
    const pm = docModelToProseMirror(doc, installed);
    const back = proseMirrorToDocModel(pm, installed) as Extract<
      DocModel,
      { kind: "document" }
    >;
    expect(back.sections[0]!.blocks[0]).toMatchObject({
      id: "ab-1",
      type: FULL_TYPE,
      riskLevel: "high",
    });
  });

  it("throws MappingError for an authored block not in the installed set", () => {
    expect(() => docModelToProseMirror(docWithAuthoredBlock(), [])).toThrow(
      MappingError,
    );
  });

  it("still maps the 15 Standard blocks when no installed set is passed", () => {
    const doc: DocModel = {
      ...(docWithAuthoredBlock() as Extract<DocModel, { kind: "document" }>),
      sections: [
        {
          id: "section-1",
          title: "Overview",
          blocks: [
            { id: "h1", type: "heading", level: 1, text: "Hi", numbered: false },
          ],
        },
      ],
    } as unknown as DocModel;
    const pm = docModelToProseMirror(doc);
    expect(pm.content[0]?.content?.[0]).toMatchObject({ type: "heading" });
  });
});

/**
 * Top-level DocModel ⇄ ProseMirror round-trip tests.
 *
 * Each per-block test file already verifies that *one block* round-trips
 * losslessly through its mapping helpers. This file verifies that the
 * **orchestrator** (mapping.ts) preserves:
 *   - kind ('document' vs 'deck')
 *   - schemaVersion
 *   - meta
 *   - section ordering
 *   - slide ordering
 *   - block ordering within sections/slides
 *   - comments array
 *
 * This is the M4 acceptance criterion T-89.
 *
 * Production path: tests/mapping-roundtrip.test.ts
 */

import { describe, expect, it, test } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { parse } from "yaml";

import { validateDocModel } from "../../src/schema/validate";
import { docModelToProseMirror, proseMirrorToDocModel } from "./mapping";

const fixturesDir = path.resolve(__dirname, "../../examples");

function loadFixture(filename: string) {
  const raw = fs.readFileSync(path.join(fixturesDir, filename), "utf8");
  const parsed = parse(raw);
  const validated = validateDocModel(parsed);
  if (!validated.ok) {
    throw new Error(
      `Fixture ${filename} failed schema validation: ${JSON.stringify(validated.errors)}`,
    );
  }
  return validated.doc;
}

describe("DocModel ⇄ ProseMirror — losslessness across all fixtures", () => {
  const fixtures = [
    "sample-proposal.yaml",
    "sample-deck.yaml",
  ];

  test.each(fixtures)("%s round-trips losslessly", (name) => {
    const original = loadFixture(name);
    const pm = docModelToProseMirror(original);
    const back = proseMirrorToDocModel(pm);
    expect(back).toEqual(original);
  });
});

describe("Mapping invariants", () => {
  it("preserves kind discriminator", () => {
    const doc = loadFixture("sample-proposal.yaml");
    const deck = loadFixture("sample-deck.yaml");
    expect(doc.kind).toBe("document");
    expect(deck.kind).toBe("deck");

    const docRound = proseMirrorToDocModel(docModelToProseMirror(doc));
    const deckRound = proseMirrorToDocModel(docModelToProseMirror(deck));
    expect(docRound.kind).toBe("document");
    expect(deckRound.kind).toBe("deck");
  });

  it("preserves comments array (even when empty)", () => {
    const doc = loadFixture("sample-proposal.yaml");
    const round = proseMirrorToDocModel(docModelToProseMirror(doc));
    expect(round.comments).toEqual(doc.comments);
  });

  it("preserves section ordering", () => {
    const doc = loadFixture("sample-proposal.yaml");
    if (doc.kind !== "document") return;
    const round = proseMirrorToDocModel(docModelToProseMirror(doc));
    if (round.kind !== "document") throw new Error("kind drift");
    expect(round.sections.map((s) => s.id)).toEqual(doc.sections.map((s) => s.id));
  });

  it("preserves block ordering within a section", () => {
    const doc = loadFixture("sample-proposal.yaml");
    if (doc.kind !== "document") return;
    const round = proseMirrorToDocModel(docModelToProseMirror(doc));
    if (round.kind !== "document") throw new Error("kind drift");
    for (let i = 0; i < doc.sections.length; i++) {
      const sectionOriginal = doc.sections[i];
      const sectionRound = round.sections[i];
      expect(sectionRound?.blocks.map((b) => b.id)).toEqual(
        sectionOriginal?.blocks.map((b) => b.id),
      );
    }
  });

  it("preserves slide layout choices in a deck", () => {
    const doc = loadFixture("sample-deck.yaml");
    if (doc.kind !== "deck") return;
    const round = proseMirrorToDocModel(docModelToProseMirror(doc));
    if (round.kind !== "deck") throw new Error("kind drift");
    expect(round.slides.map((s) => s.layout)).toEqual(doc.slides.map((s) => s.layout));
  });
});

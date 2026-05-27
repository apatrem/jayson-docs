import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DocModelSchema } from "../../src/schema/docmodel";

const TEMPLATES_DIR = join(__dirname, "../../templates");

const STANDARD_BLOCK_TYPES = new Set([
  "prose",
  "heading",
  "bullet-list",
  "numbered-list",
  "callout",
  "kpi-cards",
  "chart",
  "table",
  "timeline",
  "team",
  "risk-matrix",
  "roadmap",
  "image",
  "diagram",
  "divider",
]);

const TEMPLATES = [
  "commercial-proposal.yaml",
  "commercial-proposal-deck.yaml",
  "standard-report.yaml",
  "standard-report-deck.yaml",
];

function readTemplate(filename: string): string {
  return readFileSync(join(TEMPLATES_DIR, filename), "utf-8");
}

function collectBlockTypes(obj: unknown): string[] {
  if (obj === null || typeof obj !== "object") return [];
  if (Array.isArray(obj)) return obj.flatMap(collectBlockTypes);
  const record = obj as Record<string, unknown>;
  const types: string[] = [];
  if (typeof record["type"] === "string" && STANDARD_BLOCK_TYPES.has(record["type"])) {
    types.push(record["type"]);
  }
  for (const value of Object.values(record)) {
    types.push(...collectBlockTypes(value));
  }
  return types;
}

describe("Template validity", () => {
  for (const templateFile of TEMPLATES) {
    describe(templateFile, () => {
      it("parses via DocModelSchema with no errors", () => {
        const raw = readTemplate(templateFile);
        const parsed = parse(raw) as unknown;
        const result = DocModelSchema.safeParse(parsed);
        if (!result.success) {
          // Surface the first few issues for easier debugging
          const issues = result.error.issues.slice(0, 5).map(
            (issue) => `${issue.path.join(".")} — ${issue.message}`,
          );
          throw new Error(`Schema validation failed for ${templateFile}:\n${issues.join("\n")}`);
        }
        expect(result.success).toBe(true);
      });

      it("uses only standard block types", () => {
        const raw = readTemplate(templateFile);
        const parsed = parse(raw) as unknown;
        const usedTypes = new Set(collectBlockTypes(parsed));
        const unknownTypes = [...usedTypes].filter((t) => !STANDARD_BLOCK_TYPES.has(t));
        expect(unknownTypes).toEqual([]);
      });

      it("contains at least one [REPLACE: placeholder", () => {
        const raw = readTemplate(templateFile);
        expect(raw).toContain("[REPLACE:");
      });
    });
  }
});

/**
 * Authored-block lint agreement tests (T-163).
 *
 * This is the TypeScript half of the "both lints agree" CI gate.
 * For each fixture in tests/blocks/authored/fixtures/:
 *   - valid/ fixtures must produce 0 violations (ok: true)
 *   - invalid/ fixtures must produce ≥ 1 violation (ok: false)
 *
 * The Rust half lives in src-tauri/src/lint/tests.rs and runs the same
 * fixtures through the swc_ecma_parser-based lint. If both halves pass,
 * the two lints "agree" on every fixture by construction.
 *
 * NOTE: We cannot call Tauri IPC from Vitest (no Tauri runtime). The
 * lintAuthoredBlockSource() function from src/setup/lint-authored.ts is
 * the TypeScript implementation being tested here; the Rust tests verify the
 * sidecar independently.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lintAuthoredBlockSource } from "../../../src/setup/lint-authored";

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const FIXTURES_DIR = join(import.meta.dirname, "fixtures");

function readFixture(subdir: string, name: string): string {
  return readFileSync(join(FIXTURES_DIR, subdir, name), "utf8");
}

// ─── Valid fixtures ───────────────────────────────────────────────────────────

describe("valid fixtures — 0 violations expected", () => {
  const validFixtures = ["minimal.ts"];

  for (const fixture of validFixtures) {
    it(`${fixture} has no violations`, () => {
      const source = readFixture("valid", fixture);
      const result = lintAuthoredBlockSource(source);
      if (!result.ok) {
        // Print violations for easier debugging
        const msgs = result.violations
          .map((v) => `  [${v.rule}] line ${v.line}: ${v.message}`)
          .join("\n");
        throw new Error(`Expected no violations, got:\n${msgs}`);
      }
      expect(result.ok).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  }
});

// ─── Invalid fixtures ─────────────────────────────────────────────────────────

describe("invalid fixtures — ≥1 violation expected", () => {
  const invalidFixtures: { file: string; expectedRule: string }[] = [
    { file: "a002-react-import.ts", expectedRule: "A002-no-extra-imports" },
    { file: "a005-arrow-fn.ts",     expectedRule: "A005-no-function-values" },
    { file: "a010-eval.ts",         expectedRule: "A010-no-dangerous-patterns" },
    { file: "a011-no-header.ts",    expectedRule: "A011-manifest-header-present" },
  ];

  for (const { file, expectedRule } of invalidFixtures) {
    it(`${file} fails with ${expectedRule}`, () => {
      const source = readFixture("invalid", file);
      const result = lintAuthoredBlockSource(source);
      expect(result.ok).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      const ruleIds = result.violations.map((v) => v.rule);
      expect(ruleIds).toContain(expectedRule);
    });
  }
});

// ─── Lint function smoke tests ────────────────────────────────────────────────

describe("lintAuthoredBlockSource — smoke tests", () => {
  it("returns ok: false for empty string", () => {
    const result = lintAuthoredBlockSource("");
    expect(result.ok).toBe(false);
    // Should have A011 (no header) at minimum
    expect(result.violations.some((v) => v.rule.startsWith("A011"))).toBe(true);
  });

  it("returns ok: false for a file without a header comment", () => {
    const source = `import { defineAuthoredBlock } from "./defineAuthoredBlock";\nexport default defineAuthoredBlock({slug: "test", title:"T", paletteLabel:"T", content:"none", attrs:[], template:{kind:"text",value:"hi"}});\n`;
    const result = lintAuthoredBlockSource(source);
    expect(result.ok).toBe(false);
  });

  it("violations have non-null rule, message, line, column", () => {
    const result = lintAuthoredBlockSource("// no header\n");
    expect(result.violations.length).toBeGreaterThan(0);
    for (const v of result.violations) {
      expect(typeof v.rule).toBe("string");
      expect(v.rule.length).toBeGreaterThan(0);
      expect(typeof v.message).toBe("string");
      expect(typeof v.line).toBe("number");
      expect(typeof v.column).toBe("number");
    }
  });
});

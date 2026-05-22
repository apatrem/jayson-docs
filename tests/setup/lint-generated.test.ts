import { describe, it, expect } from "vitest";
import { buildStatBadgeGeneratedFiles } from "../../src/setup/generate-block";
import type { NewBlockProposal } from "../../src/setup/catalogue-diff";
import { lintGeneratedSource } from "../../src/setup/lint-generated";

const proposal: NewBlockProposal = {
  proposedId: "stat-badge",
  name: "Stat Badge",
  description: "Compact KPI highlight",
  observedIn: ["sample.pptx:slide-1"],
  proposedSchema: {},
  rationale: "needed",
};

describe("lintGeneratedSource", () => {
  it("passes clean generated files", () => {
    const files = buildStatBadgeGeneratedFiles(proposal, "test");
    for (const file of files) {
      const result = lintGeneratedSource(file.path, file.content);
      expect(result.ok).toBe(true);
    }
  });

  it("rejects dangerouslySetInnerHTML", () => {
    const malicious = `
      import React from "react";
      export const Evil = () => <div dangerouslySetInnerHTML={{ __html: "<b>x</b>" }} />;
    `;
    const result = lintGeneratedSource("Evil.tsx", malicious);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.rule === "dangerouslySetInnerHTML")).toBe(
      true,
    );
  });

  it("rejects hex colors in string literals", () => {
    const bad = `const color = "#FF0000"; export const x = color;`;
    const result = lintGeneratedSource("bad.ts", bad);
    expect(result.ok).toBe(false);
    expect(result.violations.some((v) => v.rule === "hex-color")).toBe(true);
  });

  it("rejects parent, localStorage, cookie, postMessage, prototype patching", () => {
    const cases: Array<{ code: string; rule: string }> = [
      { code: "const x = parent.location;", rule: "forbidden-member" },
      { code: "window.localStorage.setItem('k','v');", rule: "localStorage" },
      { code: "document.cookie = 'a=1';", rule: "document-cookie" },
      { code: "window.postMessage('x','*');", rule: "postMessage" },
      { code: "Array.prototype.foo = 1;", rule: "prototype-patch" },
    ];

    for (const { code, rule } of cases) {
      const result = lintGeneratedSource("bad.ts", code);
      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.rule === rule)).toBe(true);
    }
  });

  it("allows hex colors in generated test fixtures only", () => {
    const files = buildStatBadgeGeneratedFiles(proposal, "test");
    const testFile = files.find((f) => f.path.endsWith(".test.ts"));
    expect(testFile).toBeDefined();
    const result = lintGeneratedSource(testFile!.path, testFile!.content);
    expect(result.ok).toBe(true);
  });
});

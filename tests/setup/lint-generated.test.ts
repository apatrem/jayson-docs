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

  it("rejects literal http/https URLs in JSX URL attributes", () => {
    const urlAttributeCases: Array<{ code: string; attr: string }> = [
      { code: `const C = () => <img src="https://evil.com/x.png" />;`, attr: "src" },
      { code: `const C = () => <a href="http://evil.com">link</a>;`, attr: "href" },
      { code: `const C = () => <form action="https://evil.com/post" />;`, attr: "action" },
      { code: `const C = () => <img srcset="https://evil.com/2x.png 2x" />;`, attr: "srcset" },
      { code: `const C = () => <form formaction="https://evil.com" />;`, attr: "formaction" },
      { code: `const C = () => <video poster="https://evil.com/thumb.jpg" />;`, attr: "poster" },
      { code: `const C = () => <object data="https://evil.com/file.swf" />;`, attr: "data" },
      { code: `const C = () => <blockquote cite="https://evil.com" />;`, attr: "cite" },
      { code: `const C = () => <img src={"https://evil.com/x.png"} />;`, attr: "src (expression)" },
    ];

    for (const { code, attr } of urlAttributeCases) {
      const result = lintGeneratedSource("bad.tsx", code);
      expect(result.ok, `expected fail for ${attr}`).toBe(false);
      expect(
        result.violations.some((v) => v.rule === "url-attribute-literal"),
        `expected url-attribute-literal violation for ${attr}`,
      ).toBe(true);
    }
  });

  it("rejects literal http/https URLs inside CSS url() in style prop", () => {
    const cases = [
      `const C = () => <div style={{ background: "url(https://evil.com/bg.png)" }} />;`,
      `const C = () => <div style={{ backgroundImage: \`url(https://evil.com/bg.png)\` }} />;`,
    ];
    for (const code of cases) {
      const result = lintGeneratedSource("bad.tsx", code);
      expect(result.ok).toBe(false);
      expect(result.violations.some((v) => v.rule === "url-attribute-literal")).toBe(true);
    }
  });

  it("passes brand-token and relative-assets references in URL positions", () => {
    const safe = [
      `const C = () => <img src={brand.images.logo} />;`,
      `const C = () => <img src="assets/logo.png" />;`,
      `const C = () => <a href={props.url}>link</a>;`,
      `const C = () => <div style={{ background: brand.colors.primary }} />;`,
    ];
    for (const code of safe) {
      const result = lintGeneratedSource("safe.tsx", code);
      expect(result.violations.filter((v) => v.rule === "url-attribute-literal")).toHaveLength(0);
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

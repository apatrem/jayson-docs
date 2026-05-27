import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// T-123q (L-1 closure): renderer-side code must not reach for Node globals
// because the Tauri webview does not provide them. Vitest + Vite supply
// `Buffer`, `process`, `setImmediate`, `__dirname`, and `require()` AND
// statically replace `process.env.NODE_ENV`, so a stray renderer-side
// reference can pass tests yet crash on launch with
// `ReferenceError: process is not defined` (or the equivalent for the
// other globals). See AGENTS.md §Review playbook convention #6.
//
// This file is the project-wide enforcement of that convention. T-123n
// shipped the Buffer half (a runtime-deletion test in
// `tests/export/render-static-html.test.ts`); T-123q completes the sweep
// by (a) statically auditing every renderer-side .ts/.tsx file and
// (b) deleting `process` at runtime before exercising the dev-gate that
// previously read `process.env.NODE_ENV`.

const REPO_ROOT = process.cwd();
const SRC_DIR = join(REPO_ROOT, "src");

// CLI / Node-only entry points. These files are invoked as
// `node --import ... src/...` from npm scripts and may use Node globals.
// They're excluded from the renderer-side sweep — Vite never bundles
// them into the webview.
const NODE_CLI_FILES = new Set(
  [
    "src/setup/install.ts",
    "src/setup/regenerate.ts",
    "src/setup/scan-demos.ts",
    "src/setup/validate.ts",
    "src/setup/generate-block.ts",
    "src/export/pdf.ts",
  ].map((path) => join(REPO_ROOT, path)),
);

const FORBIDDEN_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "Buffer.<member>", regex: /\bBuffer\.\w/u },
  { name: "Buffer()", regex: /\bBuffer\s*\(/u },
  { name: "process.<member>", regex: /\bprocess\.\w/u },
  { name: "require()", regex: /\brequire\s*\(/u },
  { name: "__dirname", regex: /\b__dirname\b/u },
  { name: "setImmediate()", regex: /\bsetImmediate\s*\(/u },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

// Strip JS/TS line and block comments so a `// using process.argv` doc
// note doesn't false-positive. Conservative: doesn't handle every regex /
// template-literal corner, but the audit target is code-context tokens.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/(^|[^:])\/\/[^\n]*/gu, "$1");
}

describe("renderer-side src/ has no Node-global usages (T-123q)", () => {
  it("src/**/*.{ts,tsx} (minus Node-CLI exemptions) is clean", () => {
    const offenders: Array<{ file: string; line: number; pattern: string; text: string }> = [];
    for (const file of walk(SRC_DIR)) {
      if (NODE_CLI_FILES.has(file)) continue;
      const stripped = stripComments(readFileSync(file, "utf8"));
      stripped.split("\n").forEach((line, index) => {
        for (const { name, regex } of FORBIDDEN_PATTERNS) {
          if (regex.test(line)) {
            offenders.push({
              file: relative(REPO_ROOT, file),
              line: index + 1,
              pattern: name,
              text: line.trim(),
            });
          }
        }
      });
    }
    expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([]);
  });
});

// Note: a runtime test that deletes `process` from globalThis and then
// invokes BrandProvider was considered (mirroring T-123n's Buffer-deletion
// pattern), but React's `jsxDEV` runtime itself reads `process.env.NODE_ENV`
// during the JSX call — `<BrandContext.Provider>` would throw ReferenceError
// for that reason alone, masking what we actually want to catch. The static
// sweep above is the more reliable defense: anything that reintroduces a
// `process.<member>` (or peer Node global) in renderer-side `src/` fails the
// test deterministically and points at the file + line.

/**
 * Verifies that src/schema/** and src/blocks/**\/schema.ts files do not
 * transitively import react, @tiptap/*, or anything under src/renderer/.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const FORBIDDEN: Array<{ label: string; test: RegExp }> = [
  { label: "react", test: /^react$/ },
  { label: "@tiptap/*", test: /^@tiptap\// },
  { label: "src/renderer/", test: /[\\/]renderer[\\/]/ },
];

function extractImportSources(filePath: string): string[] {
  const content = readFileSync(filePath, "utf8");
  const importRe = /(?:^|\n)\s*(?:import|export)\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
  const sources: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(content)) !== null) {
    if (match[1] !== undefined) sources.push(match[1]);
  }
  return sources;
}

function resolveRelative(from: string, specifier: string): string | null {
  const base = resolve(dirname(from), specifier);
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + ext;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function checkPurity(startFile: string, visited = new Set<string>()): string | null {
  if (visited.has(startFile)) return null;
  visited.add(startFile);

  const sources = extractImportSources(startFile);
  for (const src of sources) {
    for (const { label, test } of FORBIDDEN) {
      if (test.test(src)) return label;
    }
    if (src.startsWith(".")) {
      const resolved = resolveRelative(startFile, src);
      if (resolved !== null && [".ts", ".tsx"].includes(extname(resolved))) {
        const violation = checkPurity(resolved, visited);
        if (violation !== null) return violation;
      }
    }
  }
  return null;
}

function walkTs(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkTs(full));
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

function findBlockSchemaFiles(): string[] {
  const blocksDir = join(repoRoot, "src", "blocks");
  if (!existsSync(blocksDir)) return [];
  return readdirSync(blocksDir)
    .map((name) => join(blocksDir, name, "schema.ts"))
    .filter(existsSync);
}

const schemaFiles = walkTs(join(repoRoot, "src", "schema"));
const blockSchemaFiles = findBlockSchemaFiles();

describe("schema purity", () => {
  for (const absPath of schemaFiles) {
    const relPath = absPath.replace(repoRoot + "/", "");
    it(`${relPath} does not transitively import react, @tiptap/*, or src/renderer/`, () => {
      const forbidden = checkPurity(absPath);
      expect(
        forbidden,
        `${relPath} imports forbidden module: ${String(forbidden)}`,
      ).toBeNull();
    });
  }

  it(`src/blocks/*/schema.ts: all ${blockSchemaFiles.length} block schema files are pure`, () => {
    // T-141 scaffolded 15 per-block schema.ts files; this test verifies they remain pure.
    expect(blockSchemaFiles.length).toBeGreaterThan(0);
    for (const file of blockSchemaFiles) {
      const relPath = file.replace(repoRoot + "/", "");
      const forbidden = checkPurity(file);
      expect(
        forbidden,
        `${relPath} imports forbidden module: ${String(forbidden)}`,
      ).toBeNull();
    }
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-argument -- AST walker over @typescript-eslint/parser nodes */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
import { readFileSync } from "node:fs";
import { parse } from "@typescript-eslint/parser";
import type { TSESTree } from "@typescript-eslint/types";

export interface LintViolation {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
}

export interface LintResult {
  ok: boolean;
  violations: LintViolation[];
}

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const URL_ATTRIBUTES = new Set([
  "src", "href", "action", "srcset", "formaction", "poster", "data", "cite",
]);
const URL_LITERAL_RE = /https?:\/\//i;
const CSS_URL_LITERAL_RE = /url\s*\(\s*https?:\/\//i;

const WHITELISTED_IMPORT_SOURCES = new Set([
  "react",
  "@tiptap/core",
  "@tiptap/react",
  "@tiptap/pm",
  "@tiptap/starter-kit",
  "zod",
  "echarts/core",
  "echarts/charts",
  "echarts/components",
  "echarts/renderers",
  "vitest",
  "react-dom/server",
]);

const ALLOWED_RELATIVE_PREFIXES = [
  "../../../src/schema/",
  "../../../src/brand-tokens/",
  "../../../src/block-primitives/",
  "../../../src/renderer/",
  "./schema",
  "./",
];

const FORBIDDEN_IDENTIFIERS = new Set([
  "eval",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "Function",
]);

const FORBIDDEN_MEMBER_ROOTS = new Set([
  "window",
  "document",
  "parent",
  "top",
  "localStorage",
  "cookie",
]);

function getJsxAttrStringValue(
  value: TSESTree.JSXAttribute["value"],
): string | null {
  if (value === null) return null;
  if (value.type === "Literal" && typeof value.value === "string") return value.value;
  if (
    value.type === "JSXExpressionContainer" &&
    value.expression.type === "Literal" &&
    typeof (value.expression as TSESTree.Literal).value === "string"
  ) {
    return (value.expression as TSESTree.Literal).value as string;
  }
  return null;
}

function walkForCssUrlLiterals(
  node: TSESTree.Node,
  file: string,
  violations: LintViolation[],
): void {
  if (node.type === "Literal" && typeof node.value === "string") {
    if (CSS_URL_LITERAL_RE.test(node.value)) {
      violations.push({
        ...loc(node, file),
        rule: "url-attribute-literal",
        message: "literal URL inside CSS url() in style prop is forbidden",
      });
    }
  }
  if (node.type === "TemplateLiteral") {
    const raw = node.quasis.map((q) => q.value.cooked ?? q.value.raw).join("");
    if (CSS_URL_LITERAL_RE.test(raw)) {
      violations.push({
        ...loc(node, file),
        rule: "url-attribute-literal",
        message: "literal URL inside CSS url() in style prop is forbidden",
      });
    }
  }
  for (const key of Object.keys(node)) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (!child) continue;
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          walkForCssUrlLiterals(item as TSESTree.Node, file, violations);
        }
      }
    } else if (typeof child === "object" && child !== null && "type" in child) {
      walkForCssUrlLiterals(child as TSESTree.Node, file, violations);
    }
  }
}

function loc(node: TSESTree.Node, file: string): LintViolation {
  const start = node.loc?.start ?? { line: 1, column: 0 };
  return {
    file,
    line: start.line,
    column: start.column,
    rule: "forbidden",
    message: "forbidden construct",
  };
}

function isAllowedImportSource(source: string): boolean {
  if (WHITELISTED_IMPORT_SOURCES.has(source)) return true;
  return ALLOWED_RELATIVE_PREFIXES.some((prefix) => source.startsWith(prefix));
}

function stringHasHexColor(value: string): boolean {
  const matches = value.match(/#[0-9A-Fa-f]{3,6}/g) ?? [];
  return matches.some((m) => HEX_COLOR_RE.test(m));
}

function isTestFixtureFile(filePath: string): boolean {
  return filePath.endsWith(".test.ts") || filePath.endsWith(".test.tsx");
}

function isIntrinsicPrototypePatch(node: TSESTree.MemberExpression): boolean {
  if (
    node.property.type === "Identifier" &&
    node.property.name === "prototype" &&
    node.object.type === "Identifier" &&
    ["Array", "Object", "String", "Number"].includes(node.object.name)
  ) {
    return true;
  }
  if (
    node.object.type === "MemberExpression" &&
    node.object.property.type === "Identifier" &&
    node.object.property.name === "prototype"
  ) {
    return isIntrinsicPrototypePatch(node.object);
  }
  return false;
}

function walkStrings(
  node: TSESTree.Node,
  file: string,
  violations: LintViolation[],
): void {
  if (isTestFixtureFile(file)) {
    return;
  }
  if (node.type === "Literal" && typeof node.value === "string") {
    if (stringHasHexColor(node.value)) {
      violations.push({
        ...loc(node, file),
        rule: "hex-color",
        message: "hard-coded hex color in string literal",
      });
    }
  }
  if (node.type === "TemplateLiteral") {
    const raw = node.quasis.map((q) => q.value.cooked ?? q.value.raw).join("");
    if (stringHasHexColor(raw)) {
      violations.push({
        ...loc(node, file),
        rule: "hex-color",
        message: "hard-coded hex color in template literal",
      });
    }
  }

  for (const key of Object.keys(node)) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (!child) continue;
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          walkStrings(item as TSESTree.Node, file, violations);
        }
      }
    } else if (typeof child === "object" && child !== null && "type" in child) {
      walkStrings(child as TSESTree.Node, file, violations);
    }
  }
}

function visitNode(node: TSESTree.Node, file: string, violations: LintViolation[]): void {
  switch (node.type) {
    case "ImportDeclaration": {
      const source = node.source.value;
      if (!isAllowedImportSource(source)) {
        violations.push({
          ...loc(node, file),
          rule: "import-whitelist",
          message: `import not whitelisted: ${source}`,
        });
      }
      break;
    }
    case "JSXAttribute": {
      if (
        node.name.type === "JSXIdentifier" &&
        node.name.name === "dangerouslySetInnerHTML"
      ) {
        violations.push({
          ...loc(node, file),
          rule: "dangerouslySetInnerHTML",
          message: "dangerouslySetInnerHTML is forbidden",
        });
      }
      if (
        node.name.type === "JSXIdentifier" &&
        URL_ATTRIBUTES.has(node.name.name)
      ) {
        const strVal = getJsxAttrStringValue(node.value);
        if (strVal !== null && URL_LITERAL_RE.test(strVal)) {
          violations.push({
            ...loc(node, file),
            rule: "url-attribute-literal",
            message: `literal URL in ${node.name.name} attribute is forbidden`,
          });
        }
      }
      if (
        node.name.type === "JSXIdentifier" &&
        node.name.name === "style" &&
        node.value !== null
      ) {
        walkForCssUrlLiterals(node.value, file, violations);
      }
      break;
    }
    case "Identifier": {
      if (FORBIDDEN_IDENTIFIERS.has(node.name)) {
        violations.push({
          ...loc(node, file),
          rule: "forbidden-identifier",
          message: `${node.name} is forbidden`,
        });
      }
      break;
    }
    case "MemberExpression": {
      const root =
        node.object.type === "Identifier"
          ? node.object.name
          : node.object.type === "MemberExpression" &&
              node.object.object.type === "Identifier"
            ? node.object.object.name
            : null;
      if (root && FORBIDDEN_MEMBER_ROOTS.has(root)) {
        violations.push({
          ...loc(node, file),
          rule: "forbidden-member",
          message: `access to ${root} is forbidden`,
        });
      }
      if (
        node.object.type === "Identifier" &&
        node.object.name === "window" &&
        node.property.type === "Identifier" &&
        node.property.name === "localStorage"
      ) {
        violations.push({
          ...loc(node, file),
          rule: "localStorage",
          message: "window.localStorage is forbidden",
        });
      }
      if (
        node.object.type === "Identifier" &&
        node.object.name === "document" &&
        node.property.type === "Identifier" &&
        node.property.name === "cookie"
      ) {
        violations.push({
          ...loc(node, file),
          rule: "document-cookie",
          message: "document.cookie is forbidden",
        });
      }
      break;
    }
    case "CallExpression": {
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "postMessage"
      ) {
        violations.push({
          ...loc(node, file),
          rule: "postMessage",
          message: "postMessage is forbidden",
        });
      }
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        ["Array", "Object", "String", "Number"].includes(node.callee.object.name) &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "prototype"
      ) {
        violations.push({
          ...loc(node, file),
          rule: "prototype-patch",
          message: "intrinsic prototype patching is forbidden",
        });
      }
      break;
    }
    case "AssignmentExpression": {
      if (
        node.left.type === "MemberExpression" &&
        isIntrinsicPrototypePatch(node.left)
      ) {
        violations.push({
          ...loc(node, file),
          rule: "prototype-patch",
          message: "intrinsic prototype patching is forbidden",
        });
      }
      break;
    }
    default:
      break;
  }

  walkStrings(node, file, violations);

  for (const key of Object.keys(node)) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (!child) continue;
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          visitNode(item as TSESTree.Node, file, violations);
        }
      }
    } else if (typeof child === "object" && child !== null && "type" in child) {
      visitNode(child as TSESTree.Node, file, violations);
    }
  }
}

export function lintGeneratedSource(
  filePath: string,
  source: string,
): LintResult {
  const violations: LintViolation[] = [];
  const ast = parse(source, {
    loc: true,
    range: true,
    ecmaVersion: "latest",
    sourceType: "module",
    jsx: true,
  }) as TSESTree.Program;

  for (const node of ast.body) {
    visitNode(node, filePath, violations);
  }

  return { ok: violations.length === 0, violations };
}

export function lintGeneratedBlock(filePath: string): LintResult {
  const source = readFileSync(filePath, "utf8");
  return lintGeneratedSource(filePath, source);
}

export function lintGeneratedBlockFiles(
  files: Array<{ path: string; content: string }>,
): LintResult {
  const violations: LintViolation[] = [];
  for (const file of files) {
    const result = lintGeneratedSource(file.path, file.content);
    violations.push(...result.violations);
  }
  return { ok: violations.length === 0, violations };
}

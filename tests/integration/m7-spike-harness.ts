import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type * as EChartsModule from "echarts";
import App from "../../src/App";
import { parseDocModelYaml } from "../../src/docmodel/serialize";
import { DocModelSchema } from "../../src/schema/docmodel";
import type { DocModel } from "../../src/schema/docmodel";

vi.mock("echarts", async () => {
  const actual = await vi.importActual<typeof EChartsModule>("echarts");
  type InitArgs = Parameters<typeof actual.init>;
  return {
    ...actual,
    init: (dom: InitArgs[0], theme?: InitArgs[1], opts?: InitArgs[2]) =>
      dom === null
        ? actual.init(dom, theme, opts)
        : {
            setOption: vi.fn(),
            resize: vi.fn(),
            dispose: vi.fn(),
          },
  };
});

export const sampleProposalPath = "/Users/me/Documents/sample-proposal.yaml";
export const sampleProposalYaml = readFileSync(
  "examples/sample-proposal.yaml",
  "utf8",
);
export const singleSectionProposalYaml = readFileSync(
  "tests/fixtures/m7-single-section-proposal.yaml",
  "utf8",
);
export const singleSectionProposalDoc = DocModelSchema.parse(
  parseDocModelYaml(singleSectionProposalYaml),
) as Extract<DocModel, { kind: "document" }>;

export interface M7HarnessOptions {
  initialYaml?: string;
  readYamlFile?: (path: string) => Promise<string>;
  writeYamlFile?: (path: string, yaml: string) => Promise<void>;
  initialDocument?: { path: string; doc: DocModel };
  useRealOpenPath?: boolean;
}

export function renderM7SpikeHarness(options: M7HarnessOptions = {}) {
  installSvgLayoutPolyfill();
  let currentYaml = options.initialYaml ?? singleSectionProposalYaml;
  let exportedHtml = "";
  let exportedPath = "";
  const invokeMock = vi.fn((cmd: string) => {
    if (cmd === "read_binary_file") {
      return Promise.resolve([0xff, 0xd8, 0xff]);
    }
    if (cmd === "plugin:shell|open") {
      return Promise.resolve();
    }
    return Promise.reject(new Error(`unexpected invoke ${cmd}`));
  });
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    configurable: true,
    value: { invoke: invokeMock },
  });

  const readYamlFile = vi.fn(
    options.readYamlFile ??
      ((_path: string) => Promise.resolve(currentYaml)),
  );
  const writeYamlFile = vi.fn(
    options.writeYamlFile ??
      ((_path: string, yaml: string) => {
        currentYaml = yaml;
        return Promise.resolve();
      }),
  );
  const exportPdf = vi.fn(
    ({ html, suggestedName }: { html: string; suggestedName: string }) => {
      exportedHtml = html;
      exportedPath = join(tmpdir(), suggestedName.replace(/\.pdf$/iu, ".html"));
      writeFileSync(exportedPath, exportedHtml);
      return Promise.resolve({
        kind: "browser_handoff" as const,
        path: exportedPath,
      });
    },
  );
  const openPath = vi.fn(() => Promise.resolve());

  const rtl = render(
    createElement(App, {
      ...(options.initialDocument === undefined
        ? {}
        : { initialDocument: options.initialDocument }),
      documentWatchdogBudgetMs: 10_000,
      fileActions: {
        selectOpenPath: () => Promise.resolve(sampleProposalPath),
        readYamlFile,
        writeYamlFile,
        exportPdf,
        ...(options.useRealOpenPath ? {} : { openPath }),
        sharedFolderPath: "/Users/me/Consultancy-Shared",
      },
    }),
  );

  return {
    ...rtl,
    readYamlFile,
    writeYamlFile,
    exportPdf,
    openPath,
    invokeMock,
    getCurrentYaml: () => currentYaml,
    getExportedHtml: () => exportedHtml,
    getExportedPath: () => exportedPath,
  };
}

function installSvgLayoutPolyfill(): void {
  if (typeof SVGElement === "undefined") return;
  if ("getBBox" in SVGElement.prototype) return;
  Object.defineProperty(SVGElement.prototype, "getBBox", {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      width: 120,
      height: 40,
    }),
  });
}

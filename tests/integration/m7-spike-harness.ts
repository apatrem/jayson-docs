import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import App from "../../src/App";
import { serializeDocModel } from "../../src/docmodel/serialize";
import type { DocModel } from "../../src/schema/docmodel";

export const sampleProposalPath = "/Users/me/Documents/sample-proposal.yaml";
export const sampleProposalYaml = readFileSync(
  "examples/sample-proposal.yaml",
  "utf8",
);

export const m7SpikeDoc: Extract<DocModel, { kind: "document" }> = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: {
    client: "Acme Industrial",
    project: "SMR Heat Strategy Assessment",
    docKind: "proposal",
    sector: "energy",
    tags: ["nuclear", "industrial heat", "decarbonization"],
    language: "en",
    status: "draft",
    archived: false,
    confidentialityLevel: "high",
    owner: "j.smith@boutique.example",
    reviewers: ["p.dubois@boutique.example"],
    createdAt: "2026-05-21T09:00:00Z",
    updatedAt: "2026-05-21T14:32:00Z",
    brandRef: "$brand:default",
  },
  sections: [
    {
      id: "section-1",
      title: "Executive summary",
      blocks: [
        {
          id: "b1-heading-01",
          type: "heading",
          level: 1,
          text: "Executive summary",
          numbered: false,
        },
        {
          id: "b1-prose-01",
          type: "prose",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Acme Industrial is evaluating SMR process-heat applications.",
                  },
                ],
              },
            ],
          },
          align: "left",
        },
      ],
    },
  ],
  comments: [],
};

export const m7SpikeYaml = serializeDocModel(m7SpikeDoc);

export interface M7HarnessOptions {
  initialYaml?: string;
  readYamlFile?: (path: string) => Promise<string>;
  writeYamlFile?: (path: string, yaml: string) => Promise<void>;
  initialDocument?: { path: string; doc: DocModel };
}

export function renderM7SpikeHarness(options: M7HarnessOptions = {}) {
  let currentYaml = options.initialYaml ?? m7SpikeYaml;
  let exportedHtml = "";
  let exportedPath = "";

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
      fileActions: {
        selectOpenPath: () => Promise.resolve(sampleProposalPath),
        readYamlFile,
        writeYamlFile,
        exportPdf,
        openPath,
        renderHtmlForExport: () => Promise.resolve(renderHarnessHtml(currentYaml)),
      },
    }),
  );

  return {
    ...rtl,
    readYamlFile,
    writeYamlFile,
    exportPdf,
    openPath,
    getCurrentYaml: () => currentYaml,
    getExportedHtml: () => exportedHtml,
    getExportedPath: () => exportedPath,
  };
}

function renderHarnessHtml(yaml: string): string {
  const calloutCount = yaml.match(/type:\s*"?callout"?/gu)?.length ?? 0;
  return `<!doctype html><html><head><style>@page { size: A4; margin: 20mm; }</style></head><body><svg role="img"></svg><aside data-block-type="callout">Inserted callouts: ${calloutCount}</aside></body></html>`;
}

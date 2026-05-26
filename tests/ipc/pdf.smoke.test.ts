import { invoke } from "@tauri-apps/api/core";
import { afterEach, describe, expect, it, vi } from "vitest";

interface ExportHandoff {
  kind: "browser_handoff";
  path: string;
}

async function exportPdf(
  html: string,
  suggestedName: string,
): Promise<ExportHandoff> {
  return invoke<ExportHandoff>("export_pdf", { html, suggestedName });
}

describe("pdf IPC smoke contract", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    vi.restoreAllMocks();
  });

  it("invokes export_pdf with print-ready HTML and a suggested name", async () => {
    const handoff: ExportHandoff = {
      kind: "browser_handoff",
      path: "/tmp/docsystem-export/id/Proposal.html",
    };
    const invokeMock = vi.fn(() => Promise.resolve(handoff));
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    await expect(
      exportPdf("<!doctype html><html></html>", "Proposal.pdf"),
    ).resolves.toEqual(handoff);
    expect(invokeMock).toHaveBeenCalledWith(
      "export_pdf",
      {
        html: "<!doctype html><html></html>",
        suggestedName: "Proposal.pdf",
      },
      undefined,
    );
  });
});

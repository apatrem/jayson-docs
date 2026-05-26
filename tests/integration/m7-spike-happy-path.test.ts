import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseDocModelYaml } from "../../src/docmodel/serialize";
import { DocModelSchema } from "../../src/schema/docmodel";
import {
  renderM7SpikeHarness,
  sampleProposalPath,
} from "./m7-spike-harness";

function countCallouts(yaml: string): number {
  return yaml.match(/type:\s*"?callout"?/gu)?.length ?? 0;
}

describe("M7 spike happy path", () => {
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    vi.restoreAllMocks();
  });

  it("opens, inserts a block, saves, reopens, and exports through browser handoff", async () => {
    const harness = renderM7SpikeHarness();
    const baselineCallouts = countCallouts(harness.getCurrentYaml());

    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Document shell")).toBeTruthy();
    });
    expect(harness.readYamlFile).toHaveBeenCalledWith(sampleProposalPath);
    expect(screen.getAllByText("Executive summary").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Insert block" }));
    const calloutButton = await screen.findByRole("button", { name: /Callout/u });
    await waitFor(() => {
      expect(calloutButton.hasAttribute("disabled")).toBe(false);
    });
    fireEvent.click(calloutButton);

    await waitFor(() => {
      expect(screen.getByLabelText("Unsaved changes")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("menuitem", { name: "Save" }));
    await waitFor(
      () => {
        expect(countCallouts(harness.getCurrentYaml())).toBeGreaterThan(
          baselineCallouts,
        );
      },
      { timeout: 4000 },
    );
    await waitFor(() => {
      expect(harness.writeYamlFile).toHaveBeenCalledWith(
        sampleProposalPath,
        expect.stringContaining("type: callout"),
      );
    });

    const savedYaml = harness.getCurrentYaml();
    expect(() => DocModelSchema.parse(parseDocModelYaml(savedYaml))).not.toThrow();

    cleanup();
    const reopened = renderM7SpikeHarness({ initialYaml: savedYaml });
    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    await waitFor(() => {
      expect(screen.getAllByText("Executive summary").length).toBeGreaterThan(0);
    });
    expect(countCallouts(reopened.getCurrentYaml())).toBeGreaterThan(
      baselineCallouts,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Export PDF" }));
    await waitFor(() => {
      expect(reopened.exportPdf).toHaveBeenCalled();
    });
    expect(reopened.openPath).toHaveBeenCalledWith(reopened.getExportedPath());
    const exportedHtml = reopened.getExportedHtml();
    const svgPayloads = decodedSvgPayloads(exportedHtml);
    expect(exportedHtml).toContain("@page { size: A4 portrait; margin: 1.5cm; }");
    expect(svgPayloads.filter((payload) => payload.includes("<svg")).length).toBeGreaterThanOrEqual(2);
    expect(exportedHtml).toContain('src="data:image/jpeg;base64,/9j/"');
    expect(exportedHtml).not.toContain("/docs/assets/");
    expect(exportedHtml).not.toContain("assets/team-meeting.jpg");
    expect(exportedHtml).not.toMatch(/<script\b/iu);
    expect(exportedHtml).toContain('data-block-type="callout"');
  });

  it("falls through to the Tauri shell plugin when no openPath test double is provided", async () => {
    const harness = renderM7SpikeHarness({ useRealOpenPath: true });

    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Document shell")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("menuitem", { name: "Export PDF" }));

    await waitFor(() => {
      expect(harness.exportPdf).toHaveBeenCalled();
    });
    expect(harness.openPath).not.toHaveBeenCalled();
    expect(harness.invokeMock).toHaveBeenCalledWith(
      "plugin:shell|open",
      { path: harness.getExportedPath(), with: undefined },
      undefined,
    );
  });
});

function decodedSvgPayloads(html: string): string[] {
  return Array.from(
    html.matchAll(/data:image\/svg\+xml(?:;charset=utf-8)?,([^"]+)/giu),
    (match) => decodeURIComponent(match[1] ?? ""),
  );
}

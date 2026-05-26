import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { m7SpikeDoc, renderM7SpikeHarness } from "./m7-spike-harness";

describe("M7 spike error paths", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows an error when opening a missing file", async () => {
    renderM7SpikeHarness({
      readYamlFile: () => Promise.reject(new Error("file not found")),
    });

    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("file not found");
    });
  });

  it("shows an error when opening malformed YAML", async () => {
    renderM7SpikeHarness({
      readYamlFile: () => Promise.resolve("kind: ["),
    });

    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent?.length ?? 0).toBeGreaterThan(
        0,
      );
    });
  });

  it("shows an error when saving fails", async () => {
    renderM7SpikeHarness({
      initialDocument: {
        path: "/Users/me/Documents/sample-proposal.yaml",
        doc: m7SpikeDoc,
      },
      writeYamlFile: () => Promise.reject(new Error("write failed")),
    });

    fireEvent.click(screen.getByRole("menuitem", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("write failed")).toBeTruthy();
    });
  });
});

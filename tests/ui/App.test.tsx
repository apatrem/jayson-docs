import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../src/App";
import type { DocModel } from "../../src/schema/docmodel";

const doc: Extract<DocModel, { kind: "document" }> = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: {
    client: "Acme",
    project: "App shell test",
    docKind: "proposal",
    tags: [],
    language: "en",
    status: "draft",
    archived: false,
    confidentialityLevel: "medium",
    owner: "owner@example.com",
    reviewers: [],
    createdAt: "2026-05-26T00:00:00Z",
    updatedAt: "2026-05-26T00:00:00Z",
    brandRef: "$brand:default",
  },
  sections: [
    {
      id: "section-1",
      title: "Overview",
      blocks: [
        {
          id: "heading-1",
          type: "heading",
          level: 1,
          text: "Overview",
          numbered: false,
        },
      ],
    },
  ],
  comments: [],
};

describe("App shell", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the welcome state with an accessible Open Document button", () => {
    render(<App />);

    expect(screen.getByLabelText("Welcome")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open Document" })).toBeTruthy();
  });

  it("switches to the document state after loading a document", async () => {
    const onOpenDocument = vi.fn(() =>
      Promise.resolve({ path: "/Users/me/Documents/proposal.yaml", doc }),
    );
    render(<App onOpenDocument={onOpenDocument} />);

    fireEvent.click(screen.getByRole("button", { name: "Open Document" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Document shell")).toBeTruthy();
    });
    expect(screen.getAllByText("proposal.yaml").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Loaded document").getAttribute("data-document-kind")).toBe(
      "document",
    );
  });

  it("returns to the welcome state from the multi-section constraint", async () => {
    render(
      <App
        fileActions={{
          selectOpenPath: () => Promise.resolve("/Users/me/Documents/sample-proposal.yaml"),
          readYamlFile: () =>
            Promise.resolve(readFileSync("examples/sample-proposal.yaml", "utf8")),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));

    await waitFor(() => {
      expect(
        screen.getByText(/Multi-section documents aren't editable yet/u),
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Back to welcome screen" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Welcome")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Open Document" })).toBeTruthy();
  });
});

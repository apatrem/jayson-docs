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
      expect(screen.getByLabelText("Document view")).toBeTruthy();
    });
    expect(screen.getByText("proposal.yaml")).toBeTruthy();
    expect(screen.getByLabelText("Loaded document").getAttribute("data-document-kind")).toBe(
      "document",
    );
  });
});

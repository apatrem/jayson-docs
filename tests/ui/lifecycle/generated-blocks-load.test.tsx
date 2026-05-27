import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GeneratedBlocksProvider,
} from "../../../src/contexts/GeneratedBlocksContext";
import { DocumentView } from "../../../src/ui/views/DocumentView";
import type { DocModel } from "../../../src/schema/docmodel";
import type { BlockPaletteItem } from "../../../src/editor/BlockPalette";

vi.mock("echarts", () => ({
  init: () => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  }),
}));

const singleSectionDoc: Extract<DocModel, { kind: "document" }> = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: {
    client: "Acme",
    project: "generated-blocks lifecycle test",
    docKind: "proposal",
    tags: [],
    language: "en",
    status: "draft",
    archived: false,
    confidentialityLevel: "medium",
    owner: "owner@example.com",
    reviewers: [],
    createdAt: "2026-05-27T00:00:00Z",
    updatedAt: "2026-05-27T00:00:00Z",
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
          text: "Test Heading",
          numbered: false,
        },
      ],
    },
  ],
  comments: [],
};

function renderWithProvider(
  loadBlocks: (root: string) => Promise<BlockPaletteItem[]>,
) {
  return render(
    <GeneratedBlocksProvider
      cloudSyncRoot="/Users/me/Documents"
      loadBlocks={loadBlocks}
    >
      <DocumentView
        path="/Users/me/Documents/test.yaml"
        initialDoc={singleSectionDoc}
      />
    </GeneratedBlocksProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GeneratedBlocksProvider — palette block visibility", () => {
  it("palette shows only default blocks when active dir is empty", async () => {
    const loadBlocks = vi.fn(() => Promise.resolve([]));
    renderWithProvider(loadBlocks);

    await waitFor(() => expect(loadBlocks).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Insert block" }));

    expect(screen.getByLabelText("Block palette")).toBeTruthy();
    expect(screen.queryAllByText(/ \(generated\)$/u)).toHaveLength(0);
  });

  it("palette shows default blocks plus generated blocks when active dir is populated", async () => {
    const generatedItem: BlockPaletteItem = {
      id: "custom-chart",
      name: "Custom Chart",
      when: "A specialized chart variant for this firm.",
      command: "insertGenerated_custom-chart",
      generated: true,
    };
    const loadBlocks = vi.fn(() => Promise.resolve([generatedItem]));
    renderWithProvider(loadBlocks);

    await waitFor(() => expect(loadBlocks).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Insert block" }));

    await waitFor(() =>
      expect(screen.getByText("Custom Chart (generated)")).toBeTruthy(),
    );
    // default blocks still present
    expect(screen.getByText("Prose")).toBeTruthy();
  });

  it("palette degrades gracefully to defaults only when loading fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const loadBlocks = vi.fn(
      () => Promise.reject(new Error("network failure")),
    );
    renderWithProvider(loadBlocks);

    await waitFor(() => expect(loadBlocks).toHaveBeenCalledOnce());
    await waitFor(() => expect(consoleError).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Insert block" }));

    expect(screen.getByLabelText("Block palette")).toBeTruthy();
    expect(screen.queryAllByText(/ \(generated\)$/u)).toHaveLength(0);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Generated blocks load failed"),
      expect.any(Error),
    );
  });
});

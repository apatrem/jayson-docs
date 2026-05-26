import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../../../src/App";
import { serializeDocModel } from "../../../src/docmodel/serialize";
import type { DocModel } from "../../../src/schema/docmodel";

const doc: Extract<DocModel, { kind: "document" }> = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: {
    client: "Acme",
    project: "File menu test",
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
          text: "Menu heading",
          numbered: false,
        },
      ],
    },
  ],
  comments: [],
};

describe("FileMenu", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens a YAML document via dialog path and read_yaml_file", async () => {
    const readYamlFile = vi.fn(() => Promise.resolve(serializeDocModel(doc)));

    render(
      <App
        fileActions={{
          selectOpenPath: () => Promise.resolve("/Users/me/Documents/menu.yaml"),
          readYamlFile,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Open" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Document shell")).toBeTruthy();
    });
    expect(readYamlFile).toHaveBeenCalledWith("/Users/me/Documents/menu.yaml");
  });

  it("saves the active document to its current path", async () => {
    const writeYamlFile = vi.fn(() => Promise.resolve());
    render(
      <App
        initialDocument={{ path: "/Users/me/Documents/menu.yaml", doc }}
        fileActions={{ writeYamlFile }}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Save" }));

    await waitFor(() => {
      expect(writeYamlFile).toHaveBeenCalledWith(
        "/Users/me/Documents/menu.yaml",
        expect.stringContaining("Menu heading"),
      );
    });
    expect(screen.getByRole("status").textContent).toBe("Saved.");
  });

  it("save-as writes to the chosen path and switches the active path", async () => {
    const writeYamlFile = vi.fn(() => Promise.resolve());
    render(
      <App
        initialDocument={{ path: "/Users/me/Documents/menu.yaml", doc }}
        fileActions={{
          writeYamlFile,
          selectSavePath: () => Promise.resolve("/Users/me/Documents/menu-copy.yaml"),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Save As" }));

    await waitFor(() => {
      expect(writeYamlFile).toHaveBeenCalledWith(
        "/Users/me/Documents/menu-copy.yaml",
        expect.stringContaining("Menu heading"),
      );
    });
    expect(screen.getAllByText("menu-copy.yaml").length).toBeGreaterThan(0);
  });

  it("save-as warns when saving outside the configured library folder", async () => {
    const writeYamlFile = vi.fn(() => Promise.resolve());
    render(
      <App
        initialDocument={{ path: "/Users/me/Library/menu.yaml", doc }}
        fileActions={{
          libraryRoot: "/Users/me/Library/",
          writeYamlFile,
          selectSavePath: () => Promise.resolve("/Users/me/Desktop/menu-copy.yaml"),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Save As" }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain(
        "outside your library folder",
      );
    });
  });

  it("exports PDF through HTML render, export_pdf IPC, and shell.open", async () => {
    const exportPdf = vi.fn(() =>
      Promise.resolve({
        kind: "browser_handoff" as const,
        path: "/tmp/docsystem-export/id/menu.html",
      }),
    );
    const openPath = vi.fn(() => Promise.resolve());
    const renderHtmlForExport = vi.fn(() => Promise.resolve("<!doctype html>"));
    render(
      <App
        initialDocument={{ path: "/Users/me/Documents/menu.yaml", doc }}
        fileActions={{ exportPdf, openPath, renderHtmlForExport }}
      />,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "Export PDF" }));

    await waitFor(() => {
      expect(exportPdf).toHaveBeenCalledWith({
        html: "<!doctype html>",
        suggestedName: "menu.pdf",
      });
    });
    expect(openPath).toHaveBeenCalledWith("/tmp/docsystem-export/id/menu.html");
    expect(screen.getByRole("status").textContent).toContain("Opened in your browser");
  });
});

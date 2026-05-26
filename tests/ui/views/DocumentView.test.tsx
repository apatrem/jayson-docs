import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { serializeDocModel } from "../../../src/docmodel/serialize";
import {
  DocumentView,
  documentToEditorContent,
  type EditorSurfaceProps,
} from "../../../src/ui/views/DocumentView";
import type { DocModel } from "../../../src/schema/docmodel";

const doc: Extract<DocModel, { kind: "document" }> = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: {
    client: "Acme",
    project: "DocumentView test",
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
          text: "Original heading",
          numbered: false,
        },
      ],
    },
  ],
  comments: [],
};

const editedDoc: Extract<DocModel, { kind: "document" }> = {
  ...doc,
  sections: [
    {
      ...doc.sections[0]!,
      blocks: [
        {
          id: "heading-1",
          type: "heading",
          level: 1,
          text: "Edited heading",
          numbered: false,
        },
      ],
    },
  ],
};

const FakeEditor: FC<EditorSurfaceProps> = ({ initialContent, onUpdate }) => (
  <button
    type="button"
    onClick={() => {
      const editedContent = documentToEditorContent(editedDoc);
      onUpdate(editedContent);
    }}
  >
    Fake edit {initialContent.content?.length ?? 0}
  </button>
);

describe("DocumentView", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("loads a document via read_yaml_file and renders it with the default brand", async () => {
    const readYamlFile = vi.fn(() => Promise.resolve(serializeDocModel(doc)));

    render(
      <DocumentView path="/Users/me/Documents/proposal.yaml" readYamlFile={readYamlFile} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Original heading")).toBeTruthy();
    });
    expect(readYamlFile).toHaveBeenCalledWith("/Users/me/Documents/proposal.yaml");
    expect(screen.getByLabelText("Rendered document preview")).toBeTruthy();
    expect(screen.getByLabelText("Editable document")).toBeTruthy();
  });

  it("autosaves edited content and reloads the saved YAML", async () => {
    let savedYaml = "";
    const writeYamlFile = vi.fn((_path: string, yaml: string) => {
      savedYaml = yaml;
      return Promise.resolve();
    });

    render(
      <DocumentView
        path="/Users/me/Documents/proposal.yaml"
        initialDoc={doc}
        writeYamlFile={writeYamlFile}
        autosaveDebounceMs={1}
        EditorComponent={FakeEditor}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Fake edit/u }));

    await waitFor(() => {
      expect(writeYamlFile).toHaveBeenCalledWith(
        "/Users/me/Documents/proposal.yaml",
        expect.stringContaining("Edited heading"),
      );
    });

    cleanup();
    render(
      <DocumentView
        path="/Users/me/Documents/proposal.yaml"
        readYamlFile={() => Promise.resolve(savedYaml)}
        EditorComponent={FakeEditor}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Edited heading")).toBeTruthy();
    });
  });
});

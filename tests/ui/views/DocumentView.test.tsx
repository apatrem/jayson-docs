import { readFileSync } from "node:fs";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, type FC } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultBrand } from "../../../src/brand/defaultBrand";
import { BrandProvider } from "../../../src/brand-tokens/BrandProvider";
import { parseDocModelYaml, serializeDocModel } from "../../../src/docmodel/serialize";
import {
  DocumentView,
  documentToEditorContent,
  type EditorSurfaceProps,
} from "../../../src/ui/views/DocumentView";
import { DocModelSchema, type DocModel } from "../../../src/schema/docmodel";

vi.mock("echarts", () => ({
  init: () => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  }),
}));

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

const multiSectionDoc: Extract<DocModel, { kind: "document" }> = {
  ...doc,
  sections: [
    doc.sections[0]!,
    {
      id: "section-2",
      title: "Second section",
      blocks: [
        {
          id: "heading-2",
          type: "heading",
          level: 2,
          text: "Second section",
          numbered: false,
        },
      ],
    },
  ],
};

const typingDoc: Extract<DocModel, { kind: "document" }> = {
  ...doc,
  sections: [
    {
      ...doc.sections[0]!,
      blocks: [
        {
          id: "prose-1",
          type: "prose",
          align: "left",
          content: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "hello world" }],
              },
            ],
          },
        },
      ],
    },
  ],
};

function loadSingleSectionFixture(): Extract<DocModel, { kind: "document" }> {
  return DocModelSchema.parse(
    parseDocModelYaml(
      readFileSync("tests/fixtures/m7-single-section-proposal.yaml", "utf8"),
    ),
  ) as Extract<DocModel, { kind: "document" }>;
}

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

function fakeEditorWith(commandName: string, command: () => boolean): FC<EditorSurfaceProps> {
  const FakePaletteEditor: FC<EditorSurfaceProps> = ({ onEditorReady }) => {
    useEffect(() => {
      onEditorReady?.({
        commands: {
          [commandName]: command,
        },
      });
      return () => {
        onEditorReady?.(null);
      };
    }, [onEditorReady]);
    return <div>Fake editable surface</div>;
  };
  return FakePaletteEditor;
}

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
      expect(
        within(screen.getByLabelText("Rendered document preview")).getByText(
          "Original heading",
        ),
      ).toBeTruthy();
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

  it("opens the block palette from the plus button and inserts a selected block", () => {
    const insertHeading = vi.fn(() => true);
    render(
      <DocumentView
        path="/Users/me/Documents/proposal.yaml"
        initialDoc={doc}
        EditorComponent={fakeEditorWith("insertHeading", insertHeading)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Insert block" }));

    expect(screen.getByLabelText("Block palette")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Heading/u }));

    expect(insertHeading).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText("Block palette")).toBeNull();
  });

  it("opens the block palette from the slash keyboard shortcut", () => {
    render(
      <DocumentView
        path="/Users/me/Documents/proposal.yaml"
        initialDoc={doc}
        EditorComponent={fakeEditorWith("insertProse", () => true)}
      />,
    );

    fireEvent.keyDown(window, { key: "/" });

    expect(screen.getByLabelText("Block palette")).toBeTruthy();
  });

  it("keeps the real editor mounted after an editor update", async () => {
    render(<DocumentView path="/Users/me/Documents/proposal.yaml" initialDoc={doc} />);

    const editorBefore = screen.getByLabelText("Document editor");

    fireEvent.click(screen.getByRole("button", { name: "Insert block" }));
    const calloutButton = screen.getByRole("button", { name: /Callout/u });

    await waitFor(() => {
      expect(calloutButton.hasAttribute("disabled")).toBe(false);
    });

    fireEvent.click(calloutButton);

    await waitFor(() => {
      expect(screen.getByLabelText("Autosave status").textContent).toBe("Saving…");
    });

    expect(screen.getByLabelText("Document editor")).toBe(editorBefore);
  });

  it("keeps the real editor mounted and focused while typing", async () => {
    const user = userEvent.setup();
    render(<DocumentView path="/Users/me/Documents/proposal.yaml" initialDoc={typingDoc} />);

    const editorBefore = screen.getByLabelText("Document editor");
    await user.click(editorBefore);
    placeCaretAtEnd(editorBefore);
    await user.type(editorBefore, "!", { skipClick: true });

    await waitFor(() => {
      expect(editorBefore.textContent).toContain("hello world");
    });
    expect(screen.getByLabelText("Document editor")).toBe(editorBefore);
    expect(document.activeElement).toBe(editorBefore);
  });

  it("opens multi-section documents in the editor", () => {
    render(
      <DocumentView
        path="/Users/me/Documents/multi-section.yaml"
        initialDoc={multiSectionDoc}
      />,
    );

    expect(screen.queryByText(/Multi-section documents aren't editable yet/u)).toBeNull();
    expect(screen.getByLabelText("Document view")).toBeTruthy();
    expect(screen.getByLabelText("Editable document")).toBeTruthy();
  });

  it("threads the current DocModel to onCreateAuthoredBlock when the Create button is clicked", () => {
    const onCreateAuthoredBlock = vi.fn();
    render(
      <DocumentView
        path="/Users/me/Documents/proposal.yaml"
        initialDoc={doc}
        onCreateAuthoredBlock={onCreateAuthoredBlock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Insert block" }));
    fireEvent.click(
      screen.getByRole("button", { name: /create new authored block/i }),
    );

    expect(onCreateAuthoredBlock).toHaveBeenCalledTimes(1);
    const passedDoc = onCreateAuthoredBlock.mock.calls[0]?.[0] as { kind: string };
    expect(passedDoc?.kind).toBe("document");
  });

  it("renders the shared single-section M7 fixture normally", () => {
    render(
      <BrandProvider tokens={defaultBrand}>
        <DocumentView
          path="/Users/me/Documents/m7-single-section-proposal.yaml"
          initialDoc={loadSingleSectionFixture()}
        />
      </BrandProvider>,
    );

    expect(screen.queryByText(/Multi-section documents aren't editable yet/u)).toBeNull();
    expect(screen.getAllByText("Executive summary").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Projected annual OPEX by scenario").length,
    ).toBeGreaterThan(0);
  });
});

function placeCaretAtEnd(element: HTMLElement): void {
  const target = element.querySelector("p") ?? element;
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState, type CSSProperties, type FC } from "react";
import type { JSONContent } from "@tiptap/react";
import { defaultBrand } from "../../brand/defaultBrand";
import { parseDocModelYaml } from "../../docmodel/serialize";
import {
  createAutosaveController,
  type AutosaveController,
} from "../../editor/autosave";
import { Editor } from "../../editor/Editor";
import { BlockPalette, type BlockPaletteProps } from "../../editor/BlockPalette";
import {
  docModelToProseMirror,
  proseMirrorToDocModel,
  type ProseMirrorDocument,
  type ProseMirrorNode,
} from "../../editor/mapping";
import { DocumentRenderer, type DocumentModel } from "../../renderer/DocumentRenderer";
import { DocModelSchema } from "../../schema/docmodel";
import { useGeneratedBlocks } from "../../contexts/GeneratedBlocksContext";

export interface EditorSurfaceProps {
  initialContent: JSONContent;
  editable: boolean;
  onUpdate: (content: JSONContent) => void;
  onEditorReady?: (editor: BlockPaletteProps["editor"]) => void;
}

export interface DocumentViewProps {
  path: string;
  initialDoc?: DocumentModel;
  readYamlFile?: (path: string) => Promise<string>;
  writeYamlFile?: (path: string, yaml: string) => Promise<void>;
  autosaveDebounceMs?: number;
  onDocumentChange?: (doc: DocumentModel) => void;
  onBackToWelcome?: () => void;
  EditorComponent?: FC<EditorSurfaceProps>;
}

const DEFAULT_AUTOSAVE_DEBOUNCE_MS = 2000;

const DefaultEditorSurface: FC<EditorSurfaceProps> = ({
  initialContent,
  editable,
  onUpdate,
  onEditorReady,
}) => (
  <Editor
    initialContent={initialContent}
    editable={editable}
    onUpdate={onUpdate}
    {...(onEditorReady === undefined
      ? {}
      : {
          onEditorReady: (readyEditor) => {
            onEditorReady(readyEditor as BlockPaletteProps["editor"]);
          },
        })}
  />
);

export const DocumentView: FC<DocumentViewProps> = ({
  path,
  initialDoc,
  readYamlFile = defaultReadYamlFile,
  writeYamlFile = defaultWriteYamlFile,
  autosaveDebounceMs = DEFAULT_AUTOSAVE_DEBOUNCE_MS,
  onDocumentChange,
  onBackToWelcome,
  EditorComponent = DefaultEditorSurface,
}) => {
  const generatedBlocks = useGeneratedBlocks();
  const [doc, setDoc] = useState<DocumentModel | null>(initialDoc ?? null);
  const [editorSeed, setEditorSeed] = useState<JSONContent | null>(() =>
    initialDoc === undefined ? null : documentToEditorContent(initialDoc),
  );
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editor, setEditor] = useState<BlockPaletteProps["editor"]>(null);
  const currentDoc = useRef<DocumentModel | null>(initialDoc ?? null);
  const autosave = useRef<AutosaveController | null>(null);

  useEffect(() => {
    autosave.current?.cancel();
    autosave.current = createAutosaveController({
      debounceMs: autosaveDebounceMs,
      writeYaml: async (yaml) => {
        await writeYamlFile(path, yaml);
        setSaveState("saved");
      },
    });
    return () => {
      autosave.current?.cancel();
      autosave.current = null;
    };
  }, [autosaveDebounceMs, path, writeYamlFile]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (initialDoc !== undefined) {
      currentDoc.current = initialDoc;
      setDoc(initialDoc);
      setEditorSeed(documentToEditorContent(initialDoc));
      return;
    }
    void readYamlFile(path)
      .then((yaml) => parseDocumentYaml(yaml))
      .then((loadedDoc) => {
        if (!cancelled) {
          currentDoc.current = loadedDoc;
          setDoc(loadedDoc);
          setEditorSeed(documentToEditorContent(loadedDoc));
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialDoc, path, readYamlFile]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "/" || paletteOpen) {
        return;
      }
      event.preventDefault();
      setPaletteOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [paletteOpen]);

  if (error !== null) {
    return (
      <main aria-label="Document view" style={styles.shell}>
        <p role="alert" style={styles.errorText}>
          {error}
        </p>
      </main>
    );
  }

  if (doc === null || editorSeed === null) {
    return (
      <main aria-label="Document view" style={styles.shell}>
        <p>Loading document…</p>
      </main>
    );
  }

  if (doc.sections.length > 1) {
    return (
      <main aria-label="Document view" style={styles.shell}>
        <section role="alert" style={styles.constraintPanel}>
          <p style={styles.errorText}>
            {
              "Multi-section documents aren't editable yet — that lands in M8. Open a single-section document, or close this and try again."
            }
          </p>
          {onBackToWelcome ? (
            <button
              type="button"
              onClick={() => {
                onBackToWelcome();
              }}
            >
              Back to welcome screen
            </button>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main aria-label="Document view" style={styles.shell}>
      <header style={styles.header}>
        <span>{basename(path)}</span>
        <div style={styles.headerActions}>
          <button
            type="button"
            aria-label="Insert block"
            onClick={() => {
              setPaletteOpen((open) => !open);
            }}
            style={styles.insertButton}
          >
            +
          </button>
          <span aria-label="Autosave status">{saveState}</span>
        </div>
      </header>
      <div style={styles.contentGrid}>
        <section aria-label="Rendered document preview" style={styles.previewPane}>
          <DocumentRenderer doc={doc} brand={defaultBrand} docFolderPath={parentPath(path)} />
        </section>
        <section aria-label="Editable document" style={styles.editorPane}>
          {/* Re-seed the editor only when a different file is opened. */}
          <EditorComponent
            key={path}
            initialContent={editorSeed}
            editable={true}
            onEditorReady={setEditor}
            onUpdate={(content) => {
              try {
                // `currentDoc.current` is initialized at mount (initialDoc or
                // null) and reassigned synchronously to `loadedDoc` in the
                // load effect before `setDoc(loadedDoc)` fires the re-render
                // that mounts the editor. By the time the editor calls back
                // here, the ref is always non-null — no `?? doc` fallback
                // needed.
                const previous = currentDoc.current!;
                const updated = editorContentToDocument(previous, content);
                currentDoc.current = updated;
                setSaveState("saving");
                onDocumentChange?.(updated);
                autosave.current?.schedule(updated);
              } catch (updateError) {
                setSaveState("failed");
                setError(
                  updateError instanceof Error
                    ? updateError.message
                    : String(updateError),
                );
              }
            }}
          />
        </section>
        {paletteOpen ? (
          <section aria-label="Insert block palette" style={styles.palettePane}>
            <BlockPalette
              editor={editor}
              generatedBlocks={generatedBlocks}
              onInsert={() => {
                setPaletteOpen(false);
              }}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
};

export function documentToEditorContent(doc: DocumentModel): JSONContent {
  const mapped = docModelToProseMirror(doc);
  const content = mapped.content.flatMap((section) =>
    (section.content ?? []).filter(isProseMirrorNode),
  ) as JSONContent[];
  return {
    type: "doc",
    content,
  };
}

export function editorContentToDocument(
  previousDoc: DocumentModel,
  editorContent: JSONContent,
): DocumentModel {
  const previousPm = docModelToProseMirror(previousDoc);
  const flatBlocks = (editorContent.content ?? []).filter(isProseMirrorNode);
  let offset = 0;
  const sectionNodes = previousDoc.sections.map((section, index) => {
    const previousSection = previousPm.content[index];
    const count = section.blocks.length;
    const end =
      index === previousDoc.sections.length - 1 ? flatBlocks.length : offset + count;
    const content = flatBlocks.slice(offset, end);
    offset = end;
    return {
      type: "section",
      attrs: previousSection?.attrs ?? {
        sectionId: section.id,
        title: section.title ?? "",
      },
      content,
    };
  });
  const nextDoc = proseMirrorToDocModel({
    type: "doc",
    attrs: previousPm.attrs,
    content: sectionNodes,
  } satisfies ProseMirrorDocument);
  if (nextDoc.kind !== "document") {
    throw new Error("DocumentView only supports kind=document");
  }
  return nextDoc;
}

async function defaultReadYamlFile(path: string): Promise<string> {
  return invoke<string>("read_yaml_file", { path });
}

async function defaultWriteYamlFile(path: string, yaml: string): Promise<void> {
  await invoke("write_yaml_file", { path, content: yaml });
}

function parseDocumentYaml(yaml: string): DocumentModel {
  const parsed = DocModelSchema.parse(parseDocModelYaml(yaml));
  if (parsed.kind !== "document") {
    throw new Error("DocumentView only supports kind=document");
  }
  return parsed;
}

function isProseMirrorNode(value: unknown): value is ProseMirrorNode {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

function basename(path: string): string {
  const index = path.lastIndexOf("/");
  return index >= 0 ? path.slice(index + 1) : path;
}

function parentPath(path: string): string {
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

const styles = {
  shell: {
    display: "grid",
    gap: "1rem",
    minHeight: "100%",
    padding: "1rem",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: "1rem",
    justifyContent: "space-between",
  },
  headerActions: {
    alignItems: "center",
    display: "flex",
    gap: "0.75rem",
  },
  insertButton: {
    cursor: "pointer",
    fontWeight: 700,
    padding: "0.375rem 0.625rem",
  },
  contentGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
  },
  previewPane: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.75rem",
    overflow: "auto",
  },
  editorPane: {
    minWidth: 0,
  },
  palettePane: {
    minWidth: "18rem",
  },
  constraintPanel: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.75rem",
    display: "grid",
    gap: "1rem",
    justifyItems: "start",
    padding: "1rem",
  },
  errorText: {
    color: "CanvasText",
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC } from "react";
import type { JSONContent } from "@tiptap/react";
import { defaultBrand } from "../../brand/defaultBrand";
import { parseDocModelYaml } from "../../docmodel/serialize";
import {
  createAutosaveController,
  type AutosaveController,
} from "../../editor/autosave";
import { Editor } from "../../editor/Editor";
import {
  docModelToProseMirror,
  proseMirrorToDocModel,
  type ProseMirrorDocument,
  type ProseMirrorNode,
} from "../../editor/mapping";
import { DocumentRenderer, type DocumentModel } from "../../renderer/DocumentRenderer";
import { DocModelSchema } from "../../schema/docmodel";

export interface EditorSurfaceProps {
  initialContent: JSONContent;
  editable: boolean;
  onUpdate: (content: JSONContent) => void;
}

export interface DocumentViewProps {
  path: string;
  initialDoc?: DocumentModel;
  readYamlFile?: (path: string) => Promise<string>;
  writeYamlFile?: (path: string, yaml: string) => Promise<void>;
  autosaveDebounceMs?: number;
  onDocumentChange?: (doc: DocumentModel) => void;
  EditorComponent?: FC<EditorSurfaceProps>;
}

const DEFAULT_AUTOSAVE_DEBOUNCE_MS = 2000;

const DefaultEditorSurface: FC<EditorSurfaceProps> = ({
  initialContent,
  editable,
  onUpdate,
}) => (
  <Editor
    key={JSON.stringify(initialContent)}
    initialContent={initialContent}
    editable={editable}
    onUpdate={onUpdate}
  />
);

export const DocumentView: FC<DocumentViewProps> = ({
  path,
  initialDoc,
  readYamlFile = defaultReadYamlFile,
  writeYamlFile = defaultWriteYamlFile,
  autosaveDebounceMs = DEFAULT_AUTOSAVE_DEBOUNCE_MS,
  onDocumentChange,
  EditorComponent = DefaultEditorSurface,
}) => {
  const [doc, setDoc] = useState<DocumentModel | null>(initialDoc ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
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
      setDoc(initialDoc);
      return;
    }
    void readYamlFile(path)
      .then((yaml) => parseDocumentYaml(yaml))
      .then((loadedDoc) => {
        if (!cancelled) {
          setDoc(loadedDoc);
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

  const editorContent = useMemo(
    () => (doc === null ? null : documentToEditorContent(doc)),
    [doc],
  );

  if (error !== null) {
    return (
      <main aria-label="Document view" style={styles.shell}>
        <p role="alert" style={styles.errorText}>
          {error}
        </p>
      </main>
    );
  }

  if (doc === null || editorContent === null) {
    return (
      <main aria-label="Document view" style={styles.shell}>
        <p>Loading document…</p>
      </main>
    );
  }

  return (
    <main aria-label="Document view" style={styles.shell}>
      <header style={styles.header}>
        <span>{basename(path)}</span>
        <span aria-label="Autosave status">{saveState}</span>
      </header>
      <div style={styles.contentGrid}>
        <section aria-label="Rendered document preview" style={styles.previewPane}>
          <DocumentRenderer doc={doc} brand={defaultBrand} docFolderPath={parentPath(path)} />
        </section>
        <section aria-label="Editable document" style={styles.editorPane}>
          <EditorComponent
            initialContent={editorContent}
            editable={true}
            onUpdate={(content) => {
              try {
                const updated = editorContentToDocument(doc, content);
                setDoc(updated);
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
  contentGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  },
  previewPane: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.75rem",
    overflow: "auto",
  },
  editorPane: {
    minWidth: 0,
  },
  errorText: {
    color: "CanvasText",
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;

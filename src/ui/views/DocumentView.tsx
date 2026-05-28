import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState, type CSSProperties, type FC, type ReactNode } from "react";
import type { JSONContent } from "@tiptap/react";
import type { Editor as TipTapEditor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { defaultBrand } from "../../brand/defaultBrand";
import { BrandProvider } from "../../brand-tokens/BrandProvider";
import { parseDocModelYaml } from "../../docmodel/serialize";
import { ChartDataPanel } from "../../blocks/chart/ChartDataPanel";
import { KpiCardsPanel } from "../../blocks/kpi-cards/KpiCardsPanel";
import type { ChartBlock } from "../../blocks/chart/schema";
import type { KpiCard, KpiCardsBlock } from "../../blocks/kpi-cards/schema";
import {
  createAutosaveController,
  type AutosaveController,
} from "../../editor/autosave";
import { Editor } from "../../editor/Editor";
import {
  denormalizeProseMarksForDocModel,
  normalizeProseMarksForEditor,
} from "../../editor/normalize-prose-marks";
import { BlockPalette, type BlockPaletteProps } from "../../editor/BlockPalette";
import {
  docModelToProseMirror,
  proseMirrorToDocModel,
  type ProseMirrorDocument,
  type ProseMirrorNode,
} from "../../editor/mapping";
import { DocumentRenderer, type DocumentModel } from "../../renderer/DocumentRenderer";
import { DocModelSchema } from "../../schema/docmodel";
import { useBrandBlocksFromRegistry } from "../../blocks/runtime-registry";
import { AuthoringPanel, type AuthoringPanelGenerateParams } from "../authoring/AuthoringPanel";
import {
  buildGenerateAuthoredBlockRequest,
  buildRefineAuthoredBlockRequest,
  type AuthoredBlockConversationTurn,
  type GenerateAuthoredBlockParams,
} from "../../llm/generate-authored-block";
import { buildAuthoredRenderer } from "../../blocks/authored/template-expander";
import type { AuthoredBlockManifest } from "../../blocks/authored/defineAuthoredBlock";
import { lintAuthoredBlock, type AuthoredBlockLintResult } from "../../ipc/authored-block";
import type { LLMRequest, LLMResponse } from "../../llm/client";

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
  EditorComponent?: FC<EditorSurfaceProps>;
  /**
   * Called when the consultant clicks "Create new Authored block" in the palette.
   * Receives the current document context so the generation pipeline (T-172 / T-173)
   * can use the surrounding blocks, brand tokens, and document tone.
   */
  onCreateAuthoredBlock?: (doc: DocumentModel) => void;
  /**
   * Injectable LLM call function for the authored-block generation pipeline.
   * Defaults to a no-op (null) when not provided — the Generate button still
   * appears but calls won't reach a real LLM.  Injected from the app root once
   * an LLMClient is available; also used in tests to assert prompt structure.
   */
  callLlm?: (request: LLMRequest) => Promise<LLMResponse>;
  /**
   * Injectable advisory lint function for the preview pipeline.
   * Defaults to the real `lintAuthoredBlock` IPC command.
   * Tests inject a stub that returns `{ ok: true, violations: [], extractedManifest: {...} }`.
   */
  lintForPreview?: (source: string) => Promise<AuthoredBlockLintResult>;
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
  EditorComponent = DefaultEditorSurface,
  onCreateAuthoredBlock,
  callLlm,
  lintForPreview = defaultLintForPreview,
}) => {
  const generatedBlocks = useBrandBlocksFromRegistry();
  const [doc, setDoc] = useState<DocumentModel | null>(initialDoc ?? null);
  const [editorSeed, setEditorSeed] = useState<JSONContent | null>(() =>
    initialDoc === undefined ? null : documentToEditorContent(initialDoc),
  );
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editor, setEditor] = useState<TipTapEditor | null>(null);
  const [authoringContext, setAuthoringContext] = useState<DocumentModel | null>(null);
  // ── Selection-driven structured-block panel (P0c) ────────────────────────
  // Tracks which atom block (chart, kpi-cards, …) is currently node-selected
  // so DocumentView can mount the matching side panel. Cleared whenever the
  // selection moves off the block.
  const [selectedNode, setSelectedNode] = useState<
    | { type: "chart" | "kpiCards"; pos: number; attrs: Record<string, unknown> }
    | null
  >(null);
  // ── Generation state (T-173) ─────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [previewNode, setPreviewNode] = useState<ReactNode>(undefined);
  const generationHistory = useRef<AuthoredBlockConversationTurn[]>([]);
  const lastGenerateParams = useRef<GenerateAuthoredBlockParams | null>(null);
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

  useEffect(() => {
    if (editor === null) return undefined;
    // Tests inject a mock editor that exposes only `commands`. Skip the
    // selection-listener wiring when the full TipTap API isn't available.
    if (typeof editor.on !== "function" || typeof editor.off !== "function") {
      return undefined;
    }
    const onSelectionUpdate = (): void => {
      const { selection } = editor.state;
      if (selection instanceof NodeSelection) {
        const name = selection.node.type.name;
        if (name === "chart" || name === "kpiCards") {
          setSelectedNode({
            type: name,
            pos: selection.from,
            attrs: { ...selection.node.attrs },
          });
          return;
        }
      }
      setSelectedNode(null);
    };
    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor]);

  // ── Generation handler (T-173) ─────────────────────────────────────────────
  const handleGenerate = (panelParams: AuthoringPanelGenerateParams): void => {
    const context = authoringContext ?? currentDoc.current;
    if (context === null || callLlm === undefined) {
      return;
    }

    const genParams: GenerateAuthoredBlockParams = {
      description: panelParams.description,
      slug: panelParams.slug,
      displayName: panelParams.displayName,
    };

    const history = generationHistory.current;
    const isRefinement = history.length > 0;

    const request = isRefinement
      ? buildRefineAuthoredBlockRequest(
          genParams,
          context,
          history,
          panelParams.description,
        )
      : buildGenerateAuthoredBlockRequest(genParams, context);

    setGenerating(true);
    lastGenerateParams.current = genParams;

    void callLlm(request)
      .then(async (response) => {
        const source = response.content.trim();

        // Append turns to conversation history for next refinement iteration.
        const userMessage = isRefinement
          ? panelParams.description
          : `Generate ${genParams.slug}: ${genParams.description}`;
        generationHistory.current = [
          ...history,
          { role: "user", content: userMessage },
          { role: "assistant", content: source },
        ];

        // Advisory lint for preview — warnings only, does not quarantine.
        const lintResult = await lintForPreview(source);
        if (lintResult.ok && lintResult.extractedManifest !== null) {
          const manifest = lintResult.extractedManifest as unknown as AuthoredBlockManifest;
          const Renderer = buildAuthoredRenderer(manifest);
          // Render a preview with empty attrs — the block renders its defaults.
          const previewBlock = { id: "preview", type: manifest.slug };
          setPreviewNode(<Renderer block={previewBlock} />);
        } else {
          // Lint failed on preview — show source as code so the consultant
          // can see what the LLM generated before it's refined.
          setPreviewNode(
            <pre style={{ fontSize: "0.75rem", overflow: "auto", margin: 0 }}>
              {source}
            </pre>,
          );
        }
      })
      .catch((genError: unknown) => {
        const msg = genError instanceof Error ? genError.message : String(genError);
        setPreviewNode(
          <p role="alert" style={{ color: "red", margin: 0 }}>
            Generation failed: {msg}
          </p>,
        );
      })
      .finally(() => {
        setGenerating(false);
      });
  };

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
      <BrandProvider tokens={defaultBrand}>
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
            onEditorReady={(e) => setEditor(e as TipTapEditor | null)}
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
              editor={editor as BlockPaletteProps["editor"]}
              generatedBlocks={generatedBlocks}
              onInsert={() => {
                setPaletteOpen(false);
              }}
              onCreateAuthoredBlock={() => {
                const current = currentDoc.current;
                if (current !== null) {
                  setAuthoringContext(current);
                  onCreateAuthoredBlock?.(current);
                }
              }}
            />
          </section>
        ) : null}
      </div>
      </BrandProvider>
      {authoringContext !== null ? (
        <div style={styles.authoringOverlay}>
          <AuthoringPanel
            docContext={authoringContext}
            onClose={() => {
              setAuthoringContext(null);
              setPreviewNode(undefined);
              generationHistory.current = [];
              lastGenerateParams.current = null;
            }}
            {...(callLlm !== undefined ? { onGenerate: handleGenerate } : {})}
            previewNode={previewNode}
            generating={generating}
          />
        </div>
      ) : null}
      {selectedNode !== null && editor !== null
        ? renderStructuredBlockPanel(selectedNode, editor, () =>
            setSelectedNode(null),
          )
        : null}
    </main>
  );
};

function renderStructuredBlockPanel(
  selection: {
    type: "chart" | "kpiCards";
    pos: number;
    attrs: Record<string, unknown>;
  },
  editor: TipTapEditor,
  onClose: () => void,
): ReactNode {
  if (selection.type === "kpiCards") {
    const block: KpiCardsBlock = {
      id: String(selection.attrs["blockId"]),
      type: "kpi-cards",
      cards: selection.attrs["cards"] as KpiCard[],
    };
    return (
      <KpiCardsPanel
        block={block}
        onUpdate={(next) => {
          editor
            .chain()
            .setNodeSelection(selection.pos)
            .updateAttributes("kpiCards", {
              cards: next.cards,
              note: next.note ?? "",
            })
            .run();
        }}
        onClose={onClose}
      />
    );
  }
  if (selection.type === "chart") {
    let block: ChartBlock | null = null;
    try {
      const parsed = JSON.parse(
        String(selection.attrs["payload"]),
      ) as Omit<ChartBlock, "id" | "type">;
      block = {
        id: String(selection.attrs["blockId"]),
        type: "chart",
        ...parsed,
      };
    } catch {
      return null;
    }
    if (block === null) return null;
    return (
      <ChartDataPanel
        block={block}
        onUpdate={(next) => {
          const { id: _id, type: _type, ...rest } = next;
          editor
            .chain()
            .setNodeSelection(selection.pos)
            .updateAttributes("chart", {
              payload: JSON.stringify(rest),
            })
            .run();
        }}
        onClose={onClose}
      />
    );
  }
  return null;
}

export function documentToEditorContent(doc: DocumentModel): JSONContent {
  const mapped = docModelToProseMirror(doc);
  return normalizeProseMarksForEditor({
    type: "doc",
    content: (mapped.content ?? []).filter(isProseMirrorNode) as JSONContent[],
  });
}

export function editorContentToDocument(
  previousDoc: DocumentModel,
  editorContent: JSONContent,
): DocumentModel {
  const previousPm = docModelToProseMirror(previousDoc);
  const normalized = denormalizeProseMarksForDocModel(editorContent);
  const nextDoc = proseMirrorToDocModel({
    type: "doc",
    attrs: previousPm.attrs,
    content: editorSectionsFromContent(normalized, previousDoc, previousPm),
  } satisfies ProseMirrorDocument);
  if (nextDoc.kind !== "document") {
    throw new Error("DocumentView only supports kind=document");
  }
  return nextDoc;
}

function editorSectionsFromContent(
  editorContent: JSONContent,
  previousDoc: DocumentModel,
  previousPm: ProseMirrorDocument,
): ProseMirrorNode[] {
  const nodes = (editorContent.content ?? []).filter(isProseMirrorNode);
  if (nodes.length === 0) {
    return [];
  }
  if (nodes[0]?.type === "section") {
    return nodes as ProseMirrorNode[];
  }
  if (previousDoc.sections.length !== 1) {
    throw new Error(
      "Editor content must use section nodes for multi-section documents",
    );
  }
  const section = previousDoc.sections[0]!;
  const previousSection = previousPm.content[0];
  return [
    {
      type: "section",
      attrs: previousSection?.attrs ?? {
        sectionId: section.id,
        title: section.title ?? "",
      },
      content: nodes,
    },
  ];
}

async function defaultReadYamlFile(path: string): Promise<string> {
  return invoke<string>("read_yaml_file", { path });
}

async function defaultLintForPreview(source: string): Promise<AuthoredBlockLintResult> {
  return lintAuthoredBlock(source);
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
  errorText: {
    color: "CanvasText",
    margin: 0,
  },
  authoringOverlay: {
    marginTop: "1rem",
  },
} satisfies Record<string, CSSProperties>;

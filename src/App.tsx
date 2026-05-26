import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { open as openShellPath } from "@tauri-apps/plugin-shell";
import { useMemo, useState, type ComponentType, type CSSProperties } from "react";
import { defaultBrand } from "./brand/defaultBrand";
import { BrandProvider } from "./brand-tokens/BrandProvider";
import { withRenderWatchdog } from "./block-primitives/RenderWatchdog";
import { parseDocModelYaml, serializeDocModel } from "./docmodel/serialize";
import { renderStaticHtmlForExport } from "./export/render-static-html";
import type { DocModel } from "./schema/docmodel";
import { DocModelSchema } from "./schema/docmodel";
import { AppErrorBoundary } from "./ui/AppErrorBoundary";
import { MenuBar } from "./ui/menu/MenuBar";
import { DocumentView, type DocumentViewProps } from "./ui/views/DocumentView";

interface LoadedDocument {
  path: string;
  doc: DocModel;
}

type AppState =
  | { kind: "welcome" }
  | {
      kind: "document";
      path: string;
      doc: DocModel;
      dirty: boolean;
      paletteOpen: boolean;
    };

export interface AppProps {
  initialDocument?: LoadedDocument;
  onOpenDocument?: () => Promise<LoadedDocument | null>;
  fileActions?: Partial<FileActionDeps>;
  DocumentViewComponent?: ComponentType<DocumentViewProps>;
  documentWatchdogBudgetMs?: number;
}

export default function App({
  initialDocument,
  onOpenDocument,
  fileActions = {},
  DocumentViewComponent = DocumentView,
  documentWatchdogBudgetMs,
}: AppProps) {
  const [state, setState] = useState<AppState>(() =>
    initialDocument === undefined
      ? { kind: "welcome" }
      : {
          kind: "document",
          path: initialDocument.path,
          doc: initialDocument.doc,
          dirty: false,
          paletteOpen: false,
        },
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [boundaryResetVersion, setBoundaryResetVersion] = useState(0);
  const WatchdoggedDocumentView = useMemo(
    () =>
      withRenderWatchdog(DocumentViewComponent, {
        ...(documentWatchdogBudgetMs === undefined
          ? {}
          : { budgetMs: documentWatchdogBudgetMs }),
      }),
    [DocumentViewComponent, documentWatchdogBudgetMs],
  );

  const openDocument = async (): Promise<void> => {
    setActionError(null);
    setStatusMessage(null);
    try {
      const loaded =
        onOpenDocument !== undefined
          ? await onOpenDocument()
          : await openDocumentFromDialog(fileActions);
      if (loaded === null) {
        return;
      }
      setState({
        kind: "document",
        path: loaded.path,
        doc: loaded.doc,
        dirty: false,
        paletteOpen: false,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  const saveDocument = async (): Promise<void> => {
    if (state.kind !== "document") return;
    setActionError(null);
    try {
      await writeDocument(fileActions, state.path, state.doc);
      setState({ ...state, dirty: false });
      setStatusMessage("Saved.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  const reopenCurrentDocument = async (): Promise<void> => {
    if (state.kind !== "document") return;
    const raw = await (fileActions.readYamlFile ?? readYamlFile)(state.path);
    const doc = DocModelSchema.parse(parseDocModelYaml(raw));
    setState({
      kind: "document",
      path: state.path,
      doc,
      dirty: false,
      paletteOpen: false,
    });
    setBoundaryResetVersion((version) => version + 1);
  };

  const returnToWelcome = (): void => {
    setActionError(null);
    setStatusMessage(null);
    setState({ kind: "welcome" });
    setBoundaryResetVersion((version) => version + 1);
  };

  const saveDocumentAs = async (): Promise<void> => {
    if (state.kind !== "document") return;
    setActionError(null);
    try {
      const selected = await selectSavePath(fileActions, state.path);
      if (selected === null) return;
      await writeDocument(fileActions, selected, state.doc);
      setState({ ...state, path: selected, dirty: false });
      setStatusMessage(
        fileActions.libraryRoot && !selected.startsWith(fileActions.libraryRoot)
          ? `Saved to ${selected}. This document is outside your library folder and won't appear in the library.`
          : "Saved As.",
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  const exportPdf = async (): Promise<void> => {
    if (state.kind !== "document" || state.doc.kind !== "document") return;
    setActionError(null);
    try {
      const renderHtml =
        fileActions.renderHtmlForExport ?? renderStaticHtmlForExport;
      const html = await renderHtml(
        state.doc,
        defaultBrand,
        parentPath(state.path),
        fileActions.sharedFolderPath ?? "/shared",
      );
      const exportHandoff = await (
        fileActions.exportPdf ??
        ((input) => invoke<ExportHandoff>("export_pdf", input))
      )({
        html,
        suggestedName: `${basename(state.path).replace(/\.ya?ml$/iu, "")}.pdf`,
      });
      await (fileActions.openPath ?? openShellPath)(exportHandoff.path);
      setStatusMessage("Opened in your browser — use Cmd-P / Ctrl-P to save as PDF.");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div style={styles.appShell}>
      <MenuBar
        canSave={state.kind === "document"}
        canExport={state.kind === "document" && state.doc.kind === "document"}
        onOpen={openDocument}
        onSave={saveDocument}
        onSaveAs={saveDocumentAs}
        onExportPdf={exportPdf}
        statusMessage={statusMessage}
      />
      {actionError ? (
        <p role="alert" style={styles.errorText}>
          {actionError}
        </p>
      ) : null}
      {state.kind === "welcome" ? (
        <main aria-label="Welcome" style={styles.welcome}>
          <section style={styles.welcomeCard}>
            <h1 style={styles.title}>Document System</h1>
            <button
              type="button"
              aria-label="Open Document"
              onClick={() => {
                void openDocument();
              }}
              style={styles.primaryButton}
            >
              Open Document
            </button>
          </section>
        </main>
      ) : (
        <main aria-label="Document shell" style={styles.documentShell}>
          <header style={styles.documentHeader}>
            <span>{basename(state.path)}</span>
            {state.dirty ? <span aria-label="Unsaved changes">●</span> : null}
          </header>
          <section
            aria-label="Loaded document"
            data-document-path={state.path}
            data-document-kind={state.doc.kind}
            style={styles.documentPlaceholder}
          >
            {state.doc.kind === "document" ? (
              <BrandProvider tokens={defaultBrand}>
                <AppErrorBoundary
                  onTryReopen={reopenCurrentDocument}
                  onBackToWelcome={returnToWelcome}
                  resetKey={`${state.path}:${boundaryResetVersion}`}
                >
                  <WatchdoggedDocumentView
                    path={state.path}
                    initialDoc={state.doc}
                    onBackToWelcome={returnToWelcome}
                    {...(fileActions.readYamlFile === undefined
                      ? {}
                      : { readYamlFile: fileActions.readYamlFile })}
                    {...(fileActions.writeYamlFile === undefined
                      ? {}
                      : { writeYamlFile: fileActions.writeYamlFile })}
                    onDocumentChange={(doc) => {
                      setState((current) =>
                        current.kind === "document"
                          ? { ...current, doc, dirty: true }
                          : current,
                      );
                    }}
                  />
                </AppErrorBoundary>
              </BrandProvider>
            ) : (
              "DocumentView"
            )}
          </section>
        </main>
      )}
    </div>
  );
}

interface ExportHandoff {
  kind: "browser_handoff";
  path: string;
}

interface FileActionDeps {
  selectOpenPath: () => Promise<string | null>;
  selectSavePath: (defaultPath: string) => Promise<string | null>;
  readYamlFile: (path: string) => Promise<string>;
  writeYamlFile: (path: string, yaml: string) => Promise<void>;
  exportPdf: (input: {
    html: string;
    suggestedName: string;
  }) => Promise<ExportHandoff>;
  openPath: (path: string) => Promise<void>;
  renderHtmlForExport: typeof renderStaticHtmlForExport;
  libraryRoot: string;
  sharedFolderPath: string;
}

async function openDocumentFromDialog(
  actions: Partial<FileActionDeps>,
): Promise<LoadedDocument | null> {
  const selected = await selectOpenPath(actions);
  if (selected === null) return null;
  const raw = await (actions.readYamlFile ?? readYamlFile)(selected);
  const doc = DocModelSchema.parse(parseDocModelYaml(raw));
  return { path: selected, doc };
}

async function selectOpenPath(
  actions: Partial<FileActionDeps>,
): Promise<string | null> {
  if (actions.selectOpenPath !== undefined) {
    return actions.selectOpenPath();
  }
  const selected = await openDialog({
    multiple: false,
    filters: [{ name: "YAML", extensions: ["yaml", "yml"] }],
  });
  return typeof selected === "string" ? selected : null;
}

async function selectSavePath(
  actions: Partial<FileActionDeps>,
  defaultPath: string,
): Promise<string | null> {
  if (actions.selectSavePath !== undefined) {
    return actions.selectSavePath(defaultPath);
  }
  const selected = await saveDialog({
    defaultPath,
    filters: [{ name: "YAML", extensions: ["yaml"] }],
  });
  return typeof selected === "string" ? selected : null;
}

async function writeDocument(
  actions: Partial<FileActionDeps>,
  path: string,
  doc: DocModel,
): Promise<void> {
  await (actions.writeYamlFile ?? writeYamlFile)(path, serializeDocModel(doc));
}

async function readYamlFile(path: string): Promise<string> {
  return invoke<string>("read_yaml_file", { path });
}

async function writeYamlFile(path: string, yaml: string): Promise<void> {
  await invoke("write_yaml_file", { path, content: yaml });
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
  appShell: {
    minHeight: "100vh",
    background: "Canvas",
    color: "CanvasText",
    fontFamily: "system-ui, sans-serif",
  },
  welcome: {
    alignItems: "center",
    display: "grid",
    minHeight: "100vh",
    justifyItems: "center",
    padding: "2rem",
  },
  welcomeCard: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.75rem",
    display: "grid",
    gap: "1rem",
    justifyItems: "center",
    padding: "2rem",
  },
  title: {
    fontSize: "1.5rem",
    margin: 0,
  },
  primaryButton: {
    cursor: "pointer",
    padding: "0.625rem 1rem",
  },
  errorText: {
    color: "CanvasText",
    margin: 0,
  },
  documentShell: {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    minHeight: "100vh",
  },
  documentHeader: {
    alignItems: "center",
    borderBottom: "1px solid ButtonBorder",
    display: "flex",
    gap: "0.5rem",
    justifyContent: "flex-end",
    padding: "0.75rem 1rem",
  },
  documentPlaceholder: {
    padding: "1rem",
  },
} satisfies Record<string, CSSProperties>;

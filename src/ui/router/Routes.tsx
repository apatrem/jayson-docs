import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { open as openShellPath } from "@tauri-apps/plugin-shell";
import { invoke } from "@tauri-apps/api/core";
import { defaultBrand } from "../../brand/defaultBrand";
import { BrandProvider } from "../../brand-tokens/BrandProvider";
import { withRenderWatchdog } from "../../block-primitives/RenderWatchdog";
import { parseDocModelYaml, serializeDocModel } from "../../docmodel/serialize";
import { renderStaticHtmlForExport } from "../../export/render-static-html";
import { formatErrorMessage } from "../../ipc/errors";
import type { DocModel } from "../../schema/docmodel";
import { DocModelSchema } from "../../schema/docmodel";
import { AppErrorBoundary } from "../AppErrorBoundary";
import { MenuBar } from "../menu/MenuBar";
import { DocumentView, type DocumentViewProps } from "../views/DocumentView";
import type { BootStrategy } from "./boot";
import type { Route, RouteIntent } from "./types";

export const DEFAULT_DOCUMENT_VIEW_RENDER_BUDGET_MS = 500;
export const LIBRARY_VIEW_RENDER_BUDGET_MS = 1500;

interface DocumentContent {
  path: string;
  doc: DocModel;
  dirty: boolean;
  paletteOpen: boolean;
}

interface ExportHandoff {
  kind: "browser_handoff";
  path: string;
}

export interface FileActionDeps {
  selectOpenPath: () => Promise<string | null>;
  selectSavePath: (defaultPath: string) => Promise<string | null>;
  readYamlFile: (path: string) => Promise<string>;
  writeYamlFile: (path: string, yaml: string) => Promise<void>;
  exportPdf: (input: { html: string; suggestedName: string }) => Promise<ExportHandoff>;
  openPath: (path: string) => Promise<void>;
  renderHtmlForExport: typeof renderStaticHtmlForExport;
  libraryRoot: string;
  sharedFolderPath: string;
}

export interface RoutesProps {
  bootStrategy: BootStrategy;
  initialDocContent?: DocumentContent | null;
  fileActions?: Partial<FileActionDeps>;
  DocumentViewComponent?: ComponentType<DocumentViewProps>;
  documentWatchdogBudgetMs?: number;
}

function routeReducer(route: Route, intent: RouteIntent): Route {
  switch (intent.intent) {
    case "__set":
      return intent.route;
    case "open-document":
      return {
        kind: "document",
        openDocs: [{ id: intent.path, path: intent.path }],
        activeIndex: 0,
      };
    case "back-to-library":
      return { kind: "library" };
    case "re-pick-folder":
      return { kind: "folder-picker", reason: "missing" };
    case "create-from-template":
    case "use-sample":
      return route;
  }
}

export function Routes({
  bootStrategy,
  initialDocContent,
  fileActions = {},
  DocumentViewComponent = DocumentView,
  documentWatchdogBudgetMs,
}: RoutesProps) {
  // When initialDocContent is provided (e.g. from tests using initialDocument),
  // initialize the route synchronously so test assertions don't need waitFor.
  const [route, dispatch] = useReducer(
    routeReducer,
    initialDocContent != null
      ? ({
          kind: "document",
          openDocs: [{ id: initialDocContent.path, path: initialDocContent.path }],
          activeIndex: 0,
        } satisfies Route)
      : ({ kind: "welcome" } satisfies Route),
  );
  const [docContent, setDocContent] = useState<DocumentContent | null>(
    initialDocContent ?? null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [boundaryResetVersion, setBoundaryResetVersion] = useState(0);

  const WatchdoggedDocumentView = useMemo(
    () =>
      withRenderWatchdog(DocumentViewComponent, {
        budgetMs: documentWatchdogBudgetMs ?? DEFAULT_DOCUMENT_VIEW_RENDER_BUDGET_MS,
      }),
    [DocumentViewComponent, documentWatchdogBudgetMs],
  );

  useEffect(() => {
    if (initialDocContent != null) return;
    void bootStrategy.bootRoute().then((initial) => {
      dispatch({ intent: "__set", route: initial });
    });
  }, [bootStrategy, initialDocContent]);

  const openDocument = useCallback(async (): Promise<void> => {
    setActionError(null);
    setStatusMessage(null);
    try {
      const path = await (fileActions.selectOpenPath ?? selectOpenPathDefault)();
      if (path === null) return;
      const raw = await (fileActions.readYamlFile ?? readYamlFileDefault)(path);
      const doc = DocModelSchema.parse(parseDocModelYaml(raw));
      setDocContent({ path, doc, dirty: false, paletteOpen: false });
      dispatch({
        intent: "open-document",
        path,
      });
    } catch (error) {
      setActionError(formatErrorMessage(error));
    }
  }, [fileActions]);

  const saveDocument = useCallback(async (): Promise<void> => {
    if (docContent === null) return;
    setActionError(null);
    try {
      await (fileActions.writeYamlFile ?? writeYamlFileDefault)(
        docContent.path,
        serializeDocModel(docContent.doc),
      );
      setDocContent({ ...docContent, dirty: false });
      setStatusMessage("Saved.");
    } catch (error) {
      setActionError(formatErrorMessage(error));
    }
  }, [docContent, fileActions]);

  const saveDocumentAs = useCallback(async (): Promise<void> => {
    if (docContent === null) return;
    setActionError(null);
    try {
      const selectSave =
        fileActions.selectSavePath ??
        ((defaultPath) => selectSavePathDefault(defaultPath));
      const selected = await selectSave(docContent.path);
      if (selected === null) return;
      await (fileActions.writeYamlFile ?? writeYamlFileDefault)(
        selected,
        serializeDocModel(docContent.doc),
      );
      setDocContent({ ...docContent, path: selected, dirty: false });
      setStatusMessage(
        fileActions.libraryRoot && !selected.startsWith(fileActions.libraryRoot)
          ? `Saved to ${selected}. This document is outside your library folder and won't appear in the library.`
          : "Saved As.",
      );
    } catch (error) {
      setActionError(formatErrorMessage(error));
    }
  }, [docContent, fileActions]);

  const reopenCurrentDocument = useCallback(async (): Promise<void> => {
    if (docContent === null) return;
    const raw = await (fileActions.readYamlFile ?? readYamlFileDefault)(docContent.path);
    const doc = DocModelSchema.parse(parseDocModelYaml(raw));
    setDocContent({ ...docContent, doc, dirty: false });
    setBoundaryResetVersion((v) => v + 1);
  }, [docContent, fileActions]);

  const returnToWelcome = useCallback((): void => {
    setActionError(null);
    setStatusMessage(null);
    setDocContent(null);
    dispatch({ intent: "__set", route: { kind: "welcome" } });
    setBoundaryResetVersion((v) => v + 1);
  }, []);

  const exportPdf = useCallback(async (): Promise<void> => {
    if (docContent === null || docContent.doc.kind !== "document") return;
    setActionError(null);
    try {
      const renderHtml = fileActions.renderHtmlForExport ?? renderStaticHtmlForExport;
      const html = await renderHtml(
        docContent.doc,
        defaultBrand,
        parentPath(docContent.path),
        fileActions.sharedFolderPath ?? "/shared",
      );
      const exportHandoff = await (
        fileActions.exportPdf ??
        ((input) => invoke<ExportHandoff>("export_pdf", input))
      )({
        html,
        suggestedName: `${basename(docContent.path).replace(/\.ya?ml$/iu, "")}.pdf`,
      });
      await (fileActions.openPath ?? openShellPath)(exportHandoff.path);
      setStatusMessage("Opened in your browser — use Cmd-P / Ctrl-P to save as PDF.");
    } catch (error) {
      setActionError(formatErrorMessage(error));
    }
  }, [docContent, fileActions]);

  const canSave = route.kind === "document" && docContent !== null;
  const canExport = canSave && docContent.doc.kind === "document";

  return (
    <div style={styles.appShell}>
      <MenuBar
        canSave={canSave}
        canExport={canExport}
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
      {route.kind === "welcome" ? (
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
      ) : route.kind === "folder-picker" ? (
        <main aria-label="Folder picker" style={styles.welcome}>
          <section style={styles.welcomeCard}>
            <h1 style={styles.title}>
              {route.reason === "first-launch"
                ? "Choose where your documents are saved"
                : "Your documents folder isn't where it used to be. Choose a new location."}
            </h1>
          </section>
        </main>
      ) : route.kind === "library" ? (
        <main aria-label="Library" style={styles.welcome}>
          <section style={styles.welcomeCard}>
            <h1 style={styles.title}>Library</h1>
            <p>Library view — implemented in T-128.</p>
          </section>
        </main>
      ) : docContent !== null ? (
        <main aria-label="Document shell" style={styles.documentShell}>
          <header style={styles.documentHeader}>
            <span>{basename(docContent.path)}</span>
            {docContent.dirty ? (
              <span aria-label="Unsaved changes">●</span>
            ) : null}
          </header>
          <section
            aria-label="Loaded document"
            data-document-path={docContent.path}
            data-document-kind={docContent.doc.kind}
            style={styles.documentPlaceholder}
          >
            {docContent.doc.kind === "document" ? (
              <BrandProvider tokens={defaultBrand}>
                <AppErrorBoundary
                  onTryReopen={reopenCurrentDocument}
                  onBackToWelcome={returnToWelcome}
                  resetKey={`${docContent.path}:${boundaryResetVersion}`}
                >
                  <WatchdoggedDocumentView
                    path={docContent.path}
                    initialDoc={docContent.doc}
                    onBackToWelcome={returnToWelcome}
                    {...(fileActions.readYamlFile === undefined
                      ? {}
                      : { readYamlFile: fileActions.readYamlFile })}
                    {...(fileActions.writeYamlFile === undefined
                      ? {}
                      : { writeYamlFile: fileActions.writeYamlFile })}
                    onDocumentChange={(doc) => {
                      setDocContent((current) =>
                        current !== null ? { ...current, doc, dirty: true } : current,
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
      ) : null}
    </div>
  );
}

async function selectOpenPathDefault(): Promise<string | null> {
  const selected = await openDialog({
    multiple: false,
    filters: [{ name: "YAML", extensions: ["yaml", "yml"] }],
  });
  return typeof selected === "string" ? selected : null;
}

async function selectSavePathDefault(defaultPath: string): Promise<string | null> {
  const selected = await saveDialog({
    defaultPath,
    filters: [{ name: "YAML", extensions: ["yaml"] }],
  });
  return typeof selected === "string" ? selected : null;
}

async function readYamlFileDefault(path: string): Promise<string> {
  return invoke<string>("read_yaml_file", { path });
}

async function writeYamlFileDefault(path: string, yaml: string): Promise<void> {
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

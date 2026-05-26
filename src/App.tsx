import { useState, type CSSProperties } from "react";
import type { DocModel } from "./schema/docmodel";

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
}

export default function App({
  initialDocument,
  onOpenDocument = () => Promise.resolve(null),
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
  const [openError, setOpenError] = useState<string | null>(null);

  const openDocument = async (): Promise<void> => {
    setOpenError(null);
    try {
      const loaded = await onOpenDocument();
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
      setOpenError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div style={styles.appShell}>
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
            {openError ? (
              <p role="alert" style={styles.errorText}>
                {openError}
              </p>
            ) : null}
          </section>
        </main>
      ) : (
        <main aria-label="Document view" style={styles.documentShell}>
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
            DocumentView
          </section>
        </main>
      )}
    </div>
  );
}

function basename(path: string): string {
  const index = path.lastIndexOf("/");
  return index >= 0 ? path.slice(index + 1) : path;
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

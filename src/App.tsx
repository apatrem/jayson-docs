import { useMemo, type ComponentType } from "react";
import type { DocModel } from "./schema/docmodel";
import type { DocumentViewProps } from "./ui/views/DocumentView";
import { createIpcBootStrategy, type BootStrategy } from "./ui/router/boot";
import { Routes, type FileActionDeps } from "./ui/router/Routes";

export { DEFAULT_DOCUMENT_VIEW_RENDER_BUDGET_MS } from "./ui/router/Routes";

interface LoadedDocument {
  path: string;
  doc: DocModel;
}

export interface AppProps {
  bootStrategy?: BootStrategy;
  initialDocument?: LoadedDocument;
  // onOpenDocument kept for API-surface continuity; file-open injection goes
  // through fileActions.selectOpenPath instead.
  onOpenDocument?: () => Promise<LoadedDocument | null>;
  fileActions?: Partial<FileActionDeps>;
  DocumentViewComponent?: ComponentType<DocumentViewProps>;
  documentWatchdogBudgetMs?: number;
}

export default function App({
  bootStrategy,
  initialDocument,
  fileActions,
  DocumentViewComponent,
  documentWatchdogBudgetMs,
}: AppProps) {
  const resolvedBootStrategy = useMemo((): BootStrategy => {
    if (bootStrategy !== undefined) return bootStrategy;
    if (initialDocument !== undefined) {
      const { path } = initialDocument;
      return {
        bootRoute: () =>
          Promise.resolve({
            kind: "document" as const,
            openDocs: [{ id: path, path }],
            activeIndex: 0,
          }),
      };
    }
    return createIpcBootStrategy();
  }, [bootStrategy, initialDocument]);

  const initialDocContent = useMemo(() => {
    if (initialDocument === undefined) return undefined;
    return {
      path: initialDocument.path,
      doc: initialDocument.doc,
      dirty: false,
      paletteOpen: false,
    };
  }, [initialDocument]);

  return (
    <Routes
      bootStrategy={resolvedBootStrategy}
      {...(initialDocContent !== undefined ? { initialDocContent } : {})}
      {...(fileActions !== undefined ? { fileActions } : {})}
      {...(DocumentViewComponent !== undefined ? { DocumentViewComponent } : {})}
      {...(documentWatchdogBudgetMs !== undefined ? { documentWatchdogBudgetMs } : {})}
    />
  );
}

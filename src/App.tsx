import { useEffect, useMemo, useState, type ComponentType } from "react";
import type { DocModel } from "./schema/docmodel";
import type { DocumentViewProps } from "./ui/views/DocumentView";
import { createIpcBootStrategy, type BootStrategy } from "./ui/router/boot";
import { Routes, type FileActionDeps } from "./ui/router/Routes";
import {
  BrandBlocksContext,
  AuthoredManifestsContext,
  loadBrandBlockPaletteItems,
  loadAuthoredManifests,
  type InstalledAuthoredBlock,
} from "./blocks/runtime-registry";
import type { BlockPaletteItem } from "./editor/BlockPalette";

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
  readAppConfig?: () => Promise<{ paths: { cloudSyncRoot: string } }>;
  loadGeneratedBlocks?: (cloudSyncRoot: string) => Promise<BlockPaletteItem[]>;
  loadAuthoredManifestSet?: (
    cloudSyncRoot: string,
  ) => Promise<InstalledAuthoredBlock[]>;
}

export default function App({
  bootStrategy,
  initialDocument,
  fileActions,
  DocumentViewComponent,
  documentWatchdogBudgetMs,
  readAppConfig = readAppConfigDefault,
  loadGeneratedBlocks = loadBrandBlockPaletteItems,
  loadAuthoredManifestSet = loadAuthoredManifests,
}: AppProps) {
  const [generatedBlocks, setGeneratedBlocks] = useState<BlockPaletteItem[]>([]);
  const [authoredManifests, setAuthoredManifests] = useState<
    InstalledAuthoredBlock[]
  >([]);

  useEffect(() => {
    readAppConfig()
      .then((config) => loadGeneratedBlocks(config.paths.cloudSyncRoot))
      .then(setGeneratedBlocks)
      .catch((e: unknown) => {
        console.error("Generated blocks load failed — palette degraded to defaults:", e);
      });
  }, [readAppConfig, loadGeneratedBlocks]);

  // Parallel channel to the palette load: the Installed manifest set feeds the
  // editor's closed schema and the editor↔DocModel mapping (ADR-0015/0016).
  useEffect(() => {
    readAppConfig()
      .then((config) => loadAuthoredManifestSet(config.paths.cloudSyncRoot))
      .then(setAuthoredManifests)
      .catch((e: unknown) => {
        console.error(
          "Authored manifests load failed — editor schema degraded to static blocks:",
          e,
        );
      });
  }, [readAppConfig, loadAuthoredManifestSet]);

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
    <BrandBlocksContext.Provider value={generatedBlocks}>
      <AuthoredManifestsContext.Provider value={authoredManifests}>
        <Routes
          bootStrategy={resolvedBootStrategy}
          {...(initialDocContent !== undefined ? { initialDocContent } : {})}
          {...(fileActions !== undefined ? { fileActions } : {})}
          {...(DocumentViewComponent !== undefined ? { DocumentViewComponent } : {})}
          {...(documentWatchdogBudgetMs !== undefined ? { documentWatchdogBudgetMs } : {})}
        />
      </AuthoredManifestsContext.Provider>
    </BrandBlocksContext.Provider>
  );
}

async function readAppConfigDefault(): Promise<{
  paths: { cloudSyncRoot: string };
}> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke("read_app_config");
}

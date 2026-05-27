import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { buildLibraryIndex } from "../../library/index-builder";
import type { LibraryEntry } from "../../library/filter";
import { DocCard } from "../../library/DocCard";
import { formatErrorMessage } from "../../ipc/errors";
import { EmptyLibraryState } from "./EmptyLibraryState";
import sampleProposalYaml from "../../../examples/sample-proposal.yaml?raw";

type IpcDirectoryEntry = { name: string; path: string; is_dir: boolean };

export interface LibraryViewDeps {
  readAppConfig: () => Promise<{ paths: { cloudSyncRoot: string } }>;
  listDirectory: (path: string) => Promise<IpcDirectoryEntry[]>;
  readYamlFile: (path: string) => Promise<string>;
  writeYamlFile: (path: string, content: string) => Promise<void>;
}

export interface LibraryViewProps {
  onOpenDoc: (yamlPath: string) => Promise<void>;
  deps?: Partial<LibraryViewDeps>;
}

type ScanStatus = "loading" | "empty" | "loaded" | "error";

export function LibraryView({ onOpenDoc, deps = {} }: LibraryViewProps) {
  const [status, setStatus] = useState<ScanStatus>("loading");
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [cloudSyncRoot, setCloudSyncRoot] = useState("");
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (root: string): Promise<void> => {
    const readYamlFile = deps.readYamlFile ?? readYamlFileDefault;
    const listDirectory = deps.listDirectory ?? listDirectoryDefault;
    setStatus("loading");
    const ipcFs = {
      listDirectory: async (path: string) => {
        const raw = await listDirectory(path);
        return raw.map((e) => ({
          name: e.name,
          path: e.path,
          kind: e.is_dir ? ("directory" as const) : ("file" as const),
        }));
      },
      readText: readYamlFile,
      stat: (_path: string) => Promise.resolve({ size: 0, mtimeMs: 0 }),
    };
    const index = await buildLibraryIndex(root, ipcFs);
    setEntries(index.entries);
    setStatus(index.entries.length === 0 ? "empty" : "loaded");
  }, [deps.listDirectory, deps.readYamlFile]);

  useEffect(() => {
    const readAppConfig = deps.readAppConfig ?? readAppConfigDefault;
    void (async () => {
      try {
        const config = await readAppConfig();
        const root = config.paths.cloudSyncRoot;
        setCloudSyncRoot(root);
        await scan(root);
      } catch (e) {
        setError(formatErrorMessage(e));
        setStatus("error");
      }
    })();
  }, [deps.readAppConfig, scan]);

  const handleUseSample = useCallback(async (): Promise<void> => {
    try {
      const writeYamlFile = deps.writeYamlFile ?? writeYamlFileDefault;
      const samplePath = joinPath(cloudSyncRoot, "Sample Proposal.yaml");
      await writeYamlFile(samplePath, sampleProposalYaml);
      await scan(cloudSyncRoot);
    } catch (e) {
      setError(formatErrorMessage(e));
    }
  }, [cloudSyncRoot, deps.writeYamlFile, scan]);

  const noop = () => undefined;

  if (status === "loading") {
    return (
      <main aria-label="Library" style={styles.shell}>
        <p style={styles.loading}>Loading library…</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main aria-label="Library" style={styles.shell}>
        <p role="alert" style={styles.errorText}>
          {error}
        </p>
      </main>
    );
  }

  return (
    <main aria-label="Library" style={styles.shell}>
      <header style={styles.header}>
        <h1 style={styles.title}>Library</h1>
      </header>
      {status === "empty" ? (
        <EmptyLibraryState
          onUseSample={() => {
            void handleUseSample();
          }}
        />
      ) : (
        <section style={styles.grid} aria-label="Document cards">
          {entries.map((entry) => (
            <DocCard
              key={entry.path}
              entry={entry}
              onOpen={(e) => {
                void onOpenDoc(joinPath(e.path, e.yamlFilename));
              }}
              onOpenAsReviewer={noop}
              onDuplicate={noop}
              onArchive={noop}
              onShowInFolder={noop}
            />
          ))}
        </section>
      )}
    </main>
  );
}

function joinPath(dir: string, name: string): string {
  return dir.endsWith("/") ? `${dir}${name}` : `${dir}/${name}`;
}

async function readAppConfigDefault(): Promise<{ paths: { cloudSyncRoot: string } }> {
  return invoke<{ paths: { cloudSyncRoot: string } }>("read_app_config");
}

async function listDirectoryDefault(path: string): Promise<IpcDirectoryEntry[]> {
  return invoke<IpcDirectoryEntry[]>("list_directory", { path });
}

async function readYamlFileDefault(path: string): Promise<string> {
  return invoke<string>("read_yaml_file", { path });
}

async function writeYamlFileDefault(path: string, content: string): Promise<void> {
  await invoke("write_yaml_file", { path, content });
}

const styles = {
  shell: {
    display: "grid",
    gridTemplateRows: "auto 1fr",
    minHeight: "100vh",
    padding: "1.5rem",
    gap: "1rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "1.5rem",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: "1rem",
    alignContent: "start",
  },
  loading: {
    color: "GrayText",
    padding: "2rem",
    textAlign: "center" as const,
  },
  errorText: {
    color: "CanvasText",
    padding: "2rem",
    textAlign: "center" as const,
    margin: 0,
  },
} satisfies Record<string, CSSProperties>;

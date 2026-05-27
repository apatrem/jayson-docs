import { useState, type CSSProperties } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { formatErrorMessage } from "../../ipc/errors";
import type { RouteIntent } from "../router/types";

export interface FolderPickerDeps {
  selectFolder: () => Promise<string | null>;
  writeAppConfig: (config: { paths: { cloudSyncRoot: string } }) => Promise<void>;
}

export interface FolderPickerScreenProps {
  reason: "first-launch" | "missing";
  dispatch: (intent: RouteIntent) => void;
  deps?: Partial<FolderPickerDeps>;
}

export function FolderPickerScreen({ reason, dispatch, deps = {} }: FolderPickerScreenProps) {
  const [error, setError] = useState<string | null>(null);

  const handleChooseFolder = async (): Promise<void> => {
    setError(null);
    try {
      const path = await (deps.selectFolder ?? selectFolderDefault)();
      if (path === null) return;
      await (deps.writeAppConfig ?? writeAppConfigDefault)({ paths: { cloudSyncRoot: path } });
      dispatch({ intent: "back-to-library" });
    } catch (e) {
      setError(formatErrorMessage(e));
    }
  };

  const heading =
    reason === "first-launch"
      ? "Choose where your documents are saved"
      : "Your documents folder isn't where it used to be. Choose a new location.";

  return (
    <main aria-label="Folder picker" style={styles.shell}>
      <section style={styles.card}>
        <h1 style={styles.title}>{heading}</h1>
        {error !== null ? (
          <p role="alert" style={styles.errorText}>
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void handleChooseFolder();
          }}
          style={styles.primaryButton}
        >
          Choose Folder…
        </button>
      </section>
    </main>
  );
}

async function selectFolderDefault(): Promise<string | null> {
  const selected = await openDialog({ directory: true, multiple: false });
  return typeof selected === "string" ? selected : null;
}

async function writeAppConfigDefault(config: {
  paths: { cloudSyncRoot: string };
}): Promise<void> {
  await invoke("write_app_config", { config });
}

const styles = {
  shell: {
    alignItems: "center",
    display: "grid",
    minHeight: "100vh",
    justifyItems: "center",
    padding: "2rem",
  },
  card: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.75rem",
    display: "grid",
    gap: "1rem",
    justifyItems: "center",
    padding: "2rem",
    maxWidth: "480px",
    textAlign: "center" as const,
  },
  title: {
    fontSize: "1.25rem",
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
} satisfies Record<string, CSSProperties>;

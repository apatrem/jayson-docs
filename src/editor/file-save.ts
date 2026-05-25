import type { DocModel } from "../schema/docmodel";
import { serializeDocModel } from "../docmodel/serialize";

export interface EditorFileSystem {
  createDirectory(path: string): Promise<void> | void;
  writeTextFile(path: string, contents: string): Promise<void> | void;
}

export interface SavedDocumentRef {
  folderPath: string;
  yamlPath: string;
}

export interface SaveAsOptions {
  cloudSyncRoot: string;
  folderName: string;
  yamlFilename?: string;
}

export async function saveDocumentAs(
  doc: DocModel,
  options: SaveAsOptions,
  fileSystem: EditorFileSystem,
): Promise<SavedDocumentRef> {
  const folderName = normalizeFolderName(options.folderName);
  const yamlFilename = options.yamlFilename ?? `${folderName}.yaml`;
  assertYamlFilename(yamlFilename);

  const folderPath = joinPath(options.cloudSyncRoot, folderName);
  const yamlPath = joinPath(folderPath, yamlFilename);
  await fileSystem.createDirectory(folderPath);
  await fileSystem.writeTextFile(yamlPath, serializeDocModel(doc));
  return { folderPath, yamlPath };
}

export async function saveExistingDocument(
  doc: DocModel,
  ref: SavedDocumentRef,
  fileSystem: Pick<EditorFileSystem, "writeTextFile">,
): Promise<void> {
  await fileSystem.writeTextFile(ref.yamlPath, serializeDocModel(doc));
}

function normalizeFolderName(folderName: string): string {
  const normalized = folderName.trim();
  if (normalized.length === 0) {
    throw new Error("Save As folder name is required");
  }
  if (normalized.includes("/") || normalized.includes("\\")) {
    throw new Error("Save As folder name must not contain path separators");
  }
  return normalized;
}

function assertYamlFilename(filename: string): void {
  if (!filename.endsWith(".yaml") || filename.includes("/") || filename.includes("\\")) {
    throw new Error("YAML filename must be a local .yaml file name");
  }
}

function joinPath(...parts: string[]): string {
  return parts
    .map((part, index) =>
      index === 0 ? part.replace(/\/+$/g, "") : part.replace(/^\/+|\/+$/g, ""),
    )
    .filter((part) => part.length > 0)
    .join("/");
}

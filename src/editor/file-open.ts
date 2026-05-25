import { parseDocModelYaml } from "../docmodel/serialize";
import { DocModelSchema, type DocModel } from "../schema/docmodel";

export interface OpenFileSystem {
  listDirectory(path: string): Promise<Array<{ name: string; path: string; kind: "file" | "directory" }>>;
  readTextFile(path: string): Promise<string>;
}

export interface OpenDocumentTarget {
  folderPath: string;
  yamlPath: string;
  doc: DocModel;
  needsWrapPrompt: boolean;
}

export async function openDocumentTarget(
  inputPath: string,
  cloudSyncRoot: string,
  fileSystem: OpenFileSystem,
): Promise<OpenDocumentTarget> {
  const normalizedInput = trimTrailingSlash(inputPath);
  const normalizedRoot = trimTrailingSlash(cloudSyncRoot);
  const isYaml = normalizedInput.endsWith(".yaml");
  const folderPath = isYaml ? parentPath(normalizedInput) : normalizedInput;
  const yamlPath = isYaml
    ? normalizedInput
    : await findYamlInFolder(normalizedInput, fileSystem);
  const raw = await fileSystem.readTextFile(yamlPath);
  const doc = DocModelSchema.parse(parseDocModelYaml(raw));
  return {
    folderPath,
    yamlPath,
    doc,
    needsWrapPrompt: isYaml && folderPath === normalizedRoot,
  };
}

async function findYamlInFolder(
  folderPath: string,
  fileSystem: OpenFileSystem,
): Promise<string> {
  const yamlFiles = (await fileSystem.listDirectory(folderPath)).filter(
    (entry) => entry.kind === "file" && entry.name.endsWith(".yaml"),
  );
  if (yamlFiles.length === 0) {
    throw new Error("No YAML document found in selected folder");
  }
  if (yamlFiles.length > 1) {
    const docYaml = yamlFiles.find((entry) => entry.name === "doc.yaml");
    if (docYaml !== undefined) {
      return docYaml.path;
    }
  }
  return yamlFiles[0]?.path ?? "";
}

function parentPath(path: string): string {
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}

function trimTrailingSlash(path: string): string {
  return path.replace(/\/+$/g, "");
}

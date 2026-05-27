import { readFileSync } from "node:fs";
import { invoke } from "@tauri-apps/api/core";
import { afterEach, describe, expect, it, vi } from "vitest";

interface AppConfig {
  schemaVersion?: string;
  paths?: { cloudSyncRoot?: string };
}

async function readAppConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("read_app_config");
}

async function writeAppConfig(config: AppConfig): Promise<void> {
  await invoke("write_app_config", { config });
}

async function getConfigDir(): Promise<string> {
  return invoke<string>("get_config_dir");
}

describe("config IPC smoke contract (T-125 / D-110)", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    vi.restoreAllMocks();
  });

  it("read_app_config invokes with no args and returns parsed config", async () => {
    const config: AppConfig = {
      schemaVersion: "0.1.0",
      paths: { cloudSyncRoot: "/Users/me/Dropbox/Docs" },
    };
    const invokeMock = vi.fn(() => Promise.resolve(config));
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    const result = await readAppConfig();
    expect(result).toEqual(config);
    expect(invokeMock).toHaveBeenCalledWith("read_app_config", {}, undefined);
  });

  it("write_app_config invokes with config payload", async () => {
    const invokeMock = vi.fn(() => Promise.resolve(null));
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    const config: AppConfig = { paths: { cloudSyncRoot: "/Users/me/Dropbox/Docs" } };
    await expect(writeAppConfig(config)).resolves.toBeUndefined();
    expect(invokeMock).toHaveBeenCalledWith(
      "write_app_config",
      { config },
      undefined,
    );
  });

  it("get_config_dir invokes with no args and returns a string path", async () => {
    const invokeMock = vi.fn(() =>
      Promise.resolve("/Users/me/Library/Application Support/com.docsystem"),
    );
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: invokeMock },
    });

    const dir = await getConfigDir();
    expect(typeof dir).toBe("string");
    expect(dir.length).toBeGreaterThan(0);
    expect(invokeMock).toHaveBeenCalledWith("get_config_dir", {}, undefined);
  });

  it("read_app_config surfaces not-found error when config file is absent", async () => {
    const error = Object.assign(new Error("config.yaml not found"), {
      kind: "not-found",
    });
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: vi.fn(() => Promise.reject(error)) },
    });

    await expect(readAppConfig()).rejects.toMatchObject({ kind: "not-found" });
  });

  it("read_app_config surfaces invalid error for malformed YAML", async () => {
    const error = Object.assign(new Error("invalid YAML"), {
      kind: "invalid",
    });
    Object.defineProperty(window, "__TAURI_INTERNALS__", {
      configurable: true,
      value: { invoke: vi.fn(() => Promise.reject(error)) },
    });

    await expect(readAppConfig()).rejects.toMatchObject({ kind: "invalid" });
  });

  it("config.rs uses config.yaml on disk (D-110 enforcement)", () => {
    const configRs = readFileSync("src-tauri/src/ipc/config.rs", "utf8");
    expect(configRs).toContain('"config.yaml"');
    expect(configRs).not.toContain('"config.json"');
  });

  it("all 3 config commands are registered in lib.rs", () => {
    const libRs = readFileSync("src-tauri/src/lib.rs", "utf8");
    expect(libRs).toContain("ipc::config::read_app_config");
    expect(libRs).toContain("ipc::config::write_app_config");
    expect(libRs).toContain("ipc::config::get_config_dir");
  });
});

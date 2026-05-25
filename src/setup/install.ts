import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { accessSync, mkdirSync, writeFileSync, constants } from "node:fs";
import { homedir, hostname, platform, userInfo } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { stringify } from "yaml";
import { z } from "zod";
import { openCostLedger } from "../cost-ledger/db";

const ProviderSchema = z.enum([
  "openai",
  "anthropic",
  "azure",
  "mistral",
  "openai-compatible",
  "local",
]);

const RoleSchema = z.enum(["consultant", "senior", "admin"]);

const EndpointSchema = z
  .object({
    provider: ProviderSchema,
    model: z.string().min(1),
    keychainEntry: z.string().min(1),
    baseUrl: z.string().url().optional(),
  })
  .strict();

export const InstallAppConfigSchema = z
  .object({
    user: z.object({
      name: z.string().min(1).max(80),
      email: z.string().email(),
      role: RoleSchema,
      initials: z.string().min(1).max(4),
    }),
    paths: z.object({
      cloudSyncRoot: z.string().min(1),
      sharedFolder: z.string().min(1),
    }),
    llm: z.object({
      fastModel: EndpointSchema,
      thinkingModel: EndpointSchema,
    }),
    costLimits: z.object({
      enabled: z.boolean(),
      monthlyUsdSoft: z.number().nonnegative(),
      monthlyUsdHard: z.number().nonnegative(),
      allowAdminOverride: z.boolean(),
    }),
    editor: z.object({
      reviewMode: z.enum(["panel", "inline", "diff"]),
      autosaveDebounceMs: z.number().int().positive(),
    }),
  })
  .strict();

type Provider = z.infer<typeof ProviderSchema>;
type Role = z.infer<typeof RoleSchema>;
type InstallAppConfig = z.infer<typeof InstallAppConfigSchema>;

interface InstallOptions {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
  read?: (prompt: string) => Promise<string>;
  write?: (message: string) => void;
  writeSecret?: (name: string, value: string) => void | Promise<void>;
  configDir?: string;
  now?: () => Date;
}

interface ParsedArgs {
  values: Map<string, string>;
  flags: Set<string>;
}

const PROVIDER_DEFAULTS: Record<Provider, { fast: string; thinking: string }> = {
  openai: { fast: "gpt-4.1-mini", thinking: "gpt-5" },
  anthropic: { fast: "claude-haiku-4", thinking: "claude-opus-4-7" },
  azure: { fast: "", thinking: "" },
  mistral: { fast: "mistral-small-latest", thinking: "mistral-large-latest" },
  "openai-compatible": { fast: "", thinking: "" },
  local: { fast: "", thinking: "" },
};

export async function runInstallCli(options: InstallOptions = {}): Promise<number> {
  const args = parseArgs(options.argv ?? process.argv.slice(2));
  const env = options.env ?? process.env;
  const write = options.write ?? ((message) => output.write(message));
  const rl =
    options.read === undefined
      ? createInterface({ input, output })
      : undefined;
  const read =
    options.read ??
    ((prompt: string) => {
      if (rl === undefined) {
        throw new Error("readline was not initialized");
      }
      return rl.question(prompt);
    });

  try {
    const nonInteractive = args.flags.has("accept-privacy-notice");
    if (!nonInteractive) {
      write(PRIVACY_NOTICE);
      const accepted = await read("Do you accept these terms? [y/N]: ");
      if (accepted.trim().toLowerCase() !== "y") {
        write("Setup cancelled: privacy notice was not accepted.\n");
        return 1;
      }
    }

    const configDir = options.configDir ?? defaultConfigDir(env);
    const config = nonInteractive
      ? buildFromFlags(args, env)
      : await buildInteractively(args, read, write, env, configDir);

    validatePaths(config.paths.cloudSyncRoot, config.paths.sharedFolder, configDir);
    InstallAppConfigSchema.parse(config);

    if (!nonInteractive) {
      write(summary(config));
      const confirmed = await read("Write this configuration? [Y/n]: ");
      if (confirmed.trim().toLowerCase() === "n") {
        write("Setup cancelled: configuration was not written.\n");
        return 1;
      }
    }

    const secrets = resolveSecrets(args, env, config);
    await verifyKeys(config, secrets);
    const writeSecret = options.writeSecret ?? writeOsSecret;
    await writeSecret("llm.fast.api-key", secrets.fast);
    await writeSecret("llm.thinking.api-key", secrets.thinking);

    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, "config.yaml"), stringify(config));
    const ledger = openCostLedger(configDir);
    ledger.close();
    write(`Setup complete. Config written to ${join(configDir, "config.yaml")}\n`);
    return 0;
  } catch (error) {
    write(`Setup failed: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  } finally {
    rl?.close();
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (raw === undefined || !raw.startsWith("--")) {
      continue;
    }
    const key = raw.slice(2);
    const next = argv[index + 1];
    if (next !== undefined && !next.startsWith("--")) {
      values.set(key, next);
      index += 1;
    } else {
      flags.add(key);
    }
  }
  return { values, flags };
}

async function buildInteractively(
  args: ParsedArgs,
  read: (prompt: string) => Promise<string>,
  write: (message: string) => void,
  env: NodeJS.ProcessEnv,
  configDir: string,
): Promise<InstallAppConfig> {
  const defaults = identityDefaults(env);
  write("\nStep 1 of 4 — Your identity\n");
  const name = await promptDefault(read, "Your name", defaults.name);
  const email = await promptDefault(read, "Your work email", defaults.email);
  const role = await promptRole(read);

  write("\nStep 2 of 4 — Cloud-sync folders\n");
  const cloudSyncRoot = await promptDefault(
    read,
    "Cloud-sync root",
    args.values.get("cloud-sync-root") ?? join(homedir(), "Dropbox", "Consultancy"),
  );
  const sharedFolder = await promptDefault(
    read,
    "Shared brand folder",
    args.values.get("shared-folder") ??
      join(homedir(), "Dropbox", "Consultancy-Shared"),
  );

  write("\nStep 3 of 4 — LLM models\n");
  const fast = await promptEndpoint("fast", read);
  const thinking = await promptEndpoint("thinking", read);

  write("\nStep 4 of 4 — API keys and cost limits\n");
  const cap = await promptMonthlyCap(read);
  const costTracking = await promptDefault(read, "Enable cost tracking? [Y/n]", "Y");
  void configDir;
  return makeConfig({
    name,
    email,
    role,
    cloudSyncRoot,
    sharedFolder,
    fast,
    thinking,
    costTrackingEnabled: costTracking.trim().toLowerCase() !== "n",
    monthlyCapUsd: cap,
  });
}

function buildFromFlags(args: ParsedArgs, env: NodeJS.ProcessEnv): InstallAppConfig {
  const required = [
    "name",
    "email",
    "role",
    "cloud-sync-root",
    "shared-folder",
    "fast-provider",
    "fast-model",
    "thinking-provider",
    "thinking-model",
    "monthly-cap-usd",
  ];
  for (const key of required) {
    if (!args.values.has(key)) {
      throw new Error(`Missing required flag --${key}`);
    }
  }
  if (env.FAST_API_KEY === undefined) {
    throw new Error("Missing FAST_API_KEY environment variable");
  }
  if (env.THINKING_API_KEY === undefined) {
    throw new Error("Missing THINKING_API_KEY environment variable");
  }

  return makeConfig({
    name: value(args, "name"),
    email: value(args, "email"),
    role: RoleSchema.parse(value(args, "role")),
    cloudSyncRoot: value(args, "cloud-sync-root"),
    sharedFolder: value(args, "shared-folder"),
    fast: endpointFromFlags(args, "fast"),
    thinking: endpointFromFlags(args, "thinking"),
    costTrackingEnabled: !args.flags.has("disable-cost-tracking"),
    monthlyCapUsd: Number(value(args, "monthly-cap-usd")),
  });
}

function makeConfig(inputConfig: {
  name: string;
  email: string;
  role: Role;
  cloudSyncRoot: string;
  sharedFolder: string;
  fast: Omit<InstallAppConfig["llm"]["fastModel"], "keychainEntry">;
  thinking: Omit<InstallAppConfig["llm"]["thinkingModel"], "keychainEntry">;
  costTrackingEnabled: boolean;
  monthlyCapUsd: number;
}): InstallAppConfig {
  const costLimit =
    inputConfig.monthlyCapUsd === 0 ? 0 : validateMonthlyCap(inputConfig.monthlyCapUsd);
  return InstallAppConfigSchema.parse({
    user: {
      name: inputConfig.name.trim(),
      email: inputConfig.email.trim(),
      role: inputConfig.role,
      initials: initials(inputConfig.name),
    },
    paths: {
      cloudSyncRoot: resolve(inputConfig.cloudSyncRoot),
      sharedFolder: resolve(inputConfig.sharedFolder),
    },
    llm: {
      fastModel: withKeychain(inputConfig.fast, "llm.fast.api-key"),
      thinkingModel: withKeychain(inputConfig.thinking, "llm.thinking.api-key"),
    },
    costLimits: {
      enabled: inputConfig.costTrackingEnabled && costLimit > 0,
      monthlyUsdSoft: costLimit,
      monthlyUsdHard: costLimit,
      allowAdminOverride: true,
    },
    editor: {
      reviewMode: "panel",
      autosaveDebounceMs: 2000,
    },
  });
}

function endpointFromFlags(
  args: ParsedArgs,
  prefix: "fast" | "thinking",
): Omit<InstallAppConfig["llm"]["fastModel"], "keychainEntry"> {
  const provider = ProviderSchema.parse(value(args, `${prefix}-provider`));
  const model = value(args, `${prefix}-model`);
  const baseUrl = args.values.get(`${prefix}-base-url`);
  return endpoint(provider, model, baseUrl);
}

async function promptEndpoint(
  kind: "fast" | "thinking",
  read: (prompt: string) => Promise<string>,
): Promise<Omit<InstallAppConfig["llm"]["fastModel"], "keychainEntry">> {
  const provider = ProviderSchema.parse(
    await promptDefault(read, `${kind} provider`, "anthropic"),
  );
  const modelDefault =
    kind === "fast"
      ? PROVIDER_DEFAULTS[provider].fast
      : PROVIDER_DEFAULTS[provider].thinking;
  const model = await promptDefault(read, `${kind} model`, modelDefault);
  const baseUrl =
    provider === "openai-compatible" || provider === "local"
      ? await promptDefault(read, `${kind} base URL`, "http://localhost:11434/v1")
      : undefined;
  return endpoint(provider, model, baseUrl);
}

function endpoint(
  provider: Provider,
  model: string,
  baseUrl?: string,
): Omit<InstallAppConfig["llm"]["fastModel"], "keychainEntry"> {
  if (model.trim().length === 0 || /\s/.test(model)) {
    throw new Error("Model name must be non-empty and contain no whitespace");
  }
  if ((provider === "openai-compatible" || provider === "local") && baseUrl === undefined) {
    throw new Error(`${provider} requires a base URL`);
  }
  const parsedBaseUrl =
    baseUrl === undefined ? undefined : z.string().url().parse(baseUrl);
  return parsedBaseUrl === undefined
    ? { provider, model }
    : { provider, model, baseUrl: parsedBaseUrl };
}

function withKeychain(
  endpointConfig: Omit<InstallAppConfig["llm"]["fastModel"], "keychainEntry">,
  keychainEntry: string,
): InstallAppConfig["llm"]["fastModel"] {
  return EndpointSchema.parse({ ...endpointConfig, keychainEntry });
}

function resolveSecrets(
  args: ParsedArgs,
  env: NodeJS.ProcessEnv,
  config: InstallAppConfig,
): { fast: string; thinking: string } {
  const fast = env.FAST_API_KEY ?? args.values.get("fast-api-key") ?? "";
  const thinking =
    env.THINKING_API_KEY ??
    args.values.get("thinking-api-key") ??
    (config.llm.fastModel.provider === config.llm.thinkingModel.provider ? fast : "");
  validateKey(config.llm.fastModel.provider, fast);
  validateKey(config.llm.thinkingModel.provider, thinking);
  return { fast, thinking };
}

async function verifyKeys(
  config: InstallAppConfig,
  secrets: { fast: string; thinking: string },
): Promise<void> {
  await verifyEndpoint(config.llm.fastModel, secrets.fast);
  await verifyEndpoint(config.llm.thinkingModel, secrets.thinking);
}

async function verifyEndpoint(
  endpointConfig: InstallAppConfig["llm"]["fastModel"],
  apiKey: string,
): Promise<void> {
  if (
    endpointConfig.provider !== "openai-compatible" &&
    endpointConfig.provider !== "local"
  ) {
    return;
  }
  const url = new URL("models", `${endpointConfig.baseUrl?.replace(/\/$/, "")}/`);
  const response = await fetch(url, {
    headers: apiKey.length === 0 ? {} : { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new Error(`Model endpoint check failed for ${endpointConfig.provider}`);
  }
}

function validateKey(provider: Provider, apiKey: string): void {
  if (provider === "local") {
    return;
  }
  if (apiKey.length === 0) {
    throw new Error(`${provider} API key is required`);
  }
  if (provider === "openai" && !apiKey.startsWith("sk-")) {
    throw new Error("OpenAI API key must start with sk-");
  }
  if (provider === "anthropic" && !apiKey.startsWith("sk-ant-")) {
    throw new Error("Anthropic API key must start with sk-ant-");
  }
}

function writeOsSecret(name: string, value: string): void {
  if (platform() === "darwin") {
    runSecretCommand("security", [
      "add-generic-password",
      "-a",
      "docsystem",
      "-s",
      name,
      "-w",
      value,
      "-U",
    ]);
    return;
  }
  if (platform() === "win32") {
    runSecretCommand("cmdkey", [`/generic:${name}`, "/user:docsystem", `/pass:${value}`]);
    return;
  }
  runSecretCommand("secret-tool", [
    "store",
    "--label",
    `Document System ${name}`,
    "service",
    "docsystem",
    "account",
    name,
  ], value);
}

function runSecretCommand(command: string, args: string[], inputValue?: string): void {
  const result = spawnSync(command, args, {
    input: inputValue,
    stdio: inputValue === undefined ? "ignore" : ["pipe", "ignore", "ignore"],
  });
  if (result.status !== 0) {
    throw new Error(`Failed to store keychain entry with ${command}`);
  }
}

function validatePaths(
  cloudSyncRoot: string,
  sharedFolder: string,
  configDir: string,
): void {
  for (const path of [cloudSyncRoot, sharedFolder]) {
    accessSync(path, constants.R_OK | constants.W_OK);
    if (resolve(path).startsWith(resolve(configDir))) {
      throw new Error("Cloud/shared paths must not be inside the app config dir");
    }
  }
}

function validateMonthlyCap(cap: number): number {
  if (!Number.isFinite(cap) || cap < 0 || cap >= 10000) {
    throw new Error("Monthly cap must be >= 0 and < 10000");
  }
  return cap;
}

async function promptMonthlyCap(read: (prompt: string) => Promise<string>): Promise<number> {
  const raw = await promptDefault(read, "Monthly cap USD", "50");
  const value = Number(raw);
  if (value === 0) {
    const confirmed = await read("Do you really want NO limit? [y/N]: ");
    if (confirmed.trim().toLowerCase() !== "y") {
      return 50;
    }
  }
  return validateMonthlyCap(value);
}

async function promptRole(read: (prompt: string) => Promise<string>): Promise<Role> {
  const raw = await promptDefault(read, "Role (consultant/senior/admin)", "consultant");
  return RoleSchema.parse(raw);
}

async function promptDefault(
  read: (prompt: string) => Promise<string>,
  label: string,
  defaultValue: string,
): Promise<string> {
  const answer = await read(`${label} [${defaultValue}]: `);
  return answer.trim().length === 0 ? defaultValue : answer.trim();
}

function identityDefaults(env: NodeJS.ProcessEnv): { name: string; email: string } {
  const fallbackName = userInfo().username;
  const name = gitConfig("user.name") ?? fallbackName;
  const email = gitConfig("user.email") ?? `${fallbackName}@${hostname()}`;
  void env;
  return { name, email };
}

function gitConfig(key: string): string | undefined {
  const result = spawnSync("git", ["config", "--global", key], {
    encoding: "utf8",
  });
  const value = result.stdout.trim();
  return value.length > 0 ? value : undefined;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function defaultConfigDir(env: NodeJS.ProcessEnv): string {
  if (platform() === "darwin") {
    return join(homedir(), "Library", "Application Support", "com.consultancy.docsystem");
  }
  if (platform() === "win32") {
    return join(env.APPDATA ?? homedir(), "com.consultancy.docsystem");
  }
  return join(env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "docsystem");
}

function value(args: ParsedArgs, key: string): string {
  const found = args.values.get(key);
  if (found === undefined) {
    throw new Error(`Missing required flag --${key}`);
  }
  return found;
}

function summary(config: InstallAppConfig): string {
  return `
Summary
User: ${config.user.name} <${config.user.email}> (${config.user.role})
Paths: ${config.paths.cloudSyncRoot} / ${config.paths.sharedFolder}
Fast model: ${config.llm.fastModel.provider} / ${config.llm.fastModel.model}
Thinking model: ${config.llm.thinkingModel.provider} / ${config.llm.thinkingModel.model}
Cost tracking: ${config.costLimits.enabled ? "ENABLED" : "DISABLED"}
Monthly cap: ${config.costLimits.monthlyUsdHard} USD
Telemetry: NONE
`;
}

const PRIVACY_NOTICE = `
Document System — Setup

This wizard configures the app for your machine.

Stored locally:
- Your user identity, cloud-sync paths, and model preferences in config.yaml.
- LLM API keys in your OS keychain, never in config.yaml.
- Per-call LLM cost fields used to enforce monthly limits.

Not stored:
- Prompt content, response content, behavioral analytics, or telemetry.

You can view, wipe, or disable cost tracking from Settings.
`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  void runInstallCli().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}

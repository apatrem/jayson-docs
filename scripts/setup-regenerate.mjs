#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  "npx",
  ["tsx", "src/setup/regenerate.ts", ...process.argv.slice(2)],
  { cwd: root, stdio: "inherit" },
);
process.exit(result.status ?? 1);

#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cwd, exit, platform } from "node:process";
import { join } from "node:path";

const tsx = join(cwd(), "node_modules", ".bin", platform === "win32" ? "tsx.cmd" : "tsx");
const result = spawnSync(tsx, ["src/setup/install.ts", ...process.argv.slice(2)], {
  stdio: "inherit",
});

exit(result.status ?? 1);

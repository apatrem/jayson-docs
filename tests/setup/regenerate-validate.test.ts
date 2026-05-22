import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, afterEach } from "vitest";
import { buildStatBadgeGeneratedFiles } from "../../src/setup/generate-block";
import { regenerateGeneratedBlocks } from "../../src/setup/regenerate";
import { validateSetup } from "../../src/setup/validate";
import { MockLlmClient } from "../../src/setup/llm-client";

describe("setup:validate (T-49)", () => {
  let installRoot: string;

  afterEach(() => {
    if (installRoot) {
      rmSync(installRoot, { recursive: true, force: true });
    }
  });

  it("passes lint on active generated blocks", () => {
    installRoot = mkdtempSync(join(tmpdir(), "setup-validate-"));
    const activeDir = join(
      installRoot,
      "generated-blocks/active/stat-badge",
    );
    mkdirSync(activeDir, { recursive: true });
    for (const file of buildStatBadgeGeneratedFiles(
      {
        proposedId: "stat-badge",
        name: "Stat Badge",
        description: "d",
        observedIn: ["a", "b"],
        proposedSchema: {},
        rationale: "r",
      },
      "test",
    )) {
      writeFileSync(join(activeDir, file.path), file.content, "utf8");
    }

    const result = validateSetup({ installRoot });
    expect(result.ok).toBe(true);
  });
});

describe("setup:regenerate (T-49)", () => {
  let installRoot: string;

  afterEach(() => {
    if (installRoot) {
      rmSync(installRoot, { recursive: true, force: true });
    }
  });

  it("detects drift and writes regen output under pending/", async () => {
    installRoot = mkdtempSync(join(tmpdir(), "setup-regen-"));
    const activeDir = join(
      installRoot,
      "generated-blocks/active/stat-badge",
    );
    mkdirSync(activeDir, { recursive: true });
    const files = buildStatBadgeGeneratedFiles(
      {
        proposedId: "stat-badge",
        name: "Stat Badge",
        description: "d",
        observedIn: ["a", "b"],
        proposedSchema: {},
        rationale: "r",
      },
      "old-model",
    );
    for (const file of files) {
      writeFileSync(join(activeDir, file.path), file.content, "utf8");
    }

    const result = await regenerateGeneratedBlocks({
      installRoot,
      llm: new MockLlmClient(),
    });

    expect(
      existsSync(join(installRoot, "generated-blocks/pending/stat-badge")),
    ).toBe(true);
    expect(result.driftedBlocks.length + result.unchangedBlocks.length).toBe(
      1,
    );

    const reportPath = join(
      installRoot,
      "generated-blocks/regenerate-report.md",
    );
    expect(existsSync(reportPath)).toBe(true);
    expect(readFileSync(reportPath, "utf8")).toContain("regenerate report");
  });
});

/**
 * Tests for QuarantinePanel (T-165).
 *
 * The panel lists quarantined Authored block .tsx files from the quarantine
 * directory, shows their lint-failure reasons, and provides Delete and Retry
 * actions.  All deps are injected; no Tauri IPC is called.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { QuarantinePanel } from "../../../src/ui/library/QuarantinePanel";
import type { QuarantinePanelDeps } from "../../../src/ui/library/QuarantinePanel";

const QUARANTINE_DIR = "/cloud/generated-blocks/quarantine";

/** Minimal valid manifest header for a quarantined block. */
const MINIMAL_HEADER = `/**
 * authored-block-header: 1
 * scaffold-version: 1.0.0
 * sender: alice@example.com
 * timestamp: 2026-05-27T00:00:00Z
 * slug: bad-import-block
 */\n`;

const VIOLATIONS_JSON = JSON.stringify([
  {
    rule: "A002-no-extra-imports",
    message: "import from 'react' is not on the Authored allow-list",
    line: 10,
    column: 0,
  },
]);

function makeDeps(overrides: Partial<QuarantinePanelDeps> = {}): QuarantinePanelDeps {
  return {
    listDirectory: vi.fn().mockResolvedValue([
      { name: "bad-import-block.tsx", path: `${QUARANTINE_DIR}/bad-import-block.tsx`, is_dir: false },
    ]),
    readFile: vi.fn().mockImplementation((path: string) => {
      if (path.endsWith(".violations.json")) return Promise.resolve(VIOLATIONS_JSON);
      return Promise.resolve(MINIMAL_HEADER);
    }),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    importAuthoredBlock: vi.fn().mockResolvedValue({
      ok: false,
      installedPath: `${QUARANTINE_DIR}/bad-import-block.tsx`,
      violations: [{ rule: "A002-no-extra-imports", message: "still failing", line: 10, column: 0 }],
    }),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("QuarantinePanel", () => {
  it("renders nothing when the quarantine directory is empty", async () => {
    const deps = makeDeps({
      listDirectory: vi.fn().mockResolvedValue([]),
    });
    const { container } = render(
      createElement(QuarantinePanel, { quarantineDir: QUARANTINE_DIR, deps }),
    );
    // Panel should not appear
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("shows quarantined block with slug, sender, and violation reason", async () => {
    const deps = makeDeps();
    render(createElement(QuarantinePanel, { quarantineDir: QUARANTINE_DIR, deps }));

    await waitFor(() => {
      expect(screen.getByLabelText("Quarantined blocks")).toBeTruthy();
    });

    // Slug derived from filename
    expect(screen.getByText("bad-import-block")).toBeTruthy();
    // Sender parsed from manifest header
    expect(screen.getByText("alice@example.com")).toBeTruthy();
    // Violation reason
    expect(screen.getByText(/A002-no-extra-imports/)).toBeTruthy();
  });

  it("Delete removes the entry and calls deleteFile for .tsx and sidecar", async () => {
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({ deleteFile });
    render(createElement(QuarantinePanel, { quarantineDir: QUARANTINE_DIR, deps }));

    await waitFor(() => {
      expect(screen.getByLabelText("Delete quarantined block bad-import-block")).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText("Delete quarantined block bad-import-block"));

    await waitFor(() => {
      expect(deleteFile).toHaveBeenCalledWith(`${QUARANTINE_DIR}/bad-import-block.tsx`);
      expect(deleteFile).toHaveBeenCalledWith(
        `${QUARANTINE_DIR}/bad-import-block.tsx.violations.json`,
      );
    });
    // After deletion the panel should disappear (no entries left)
    await waitFor(() => {
      expect(screen.queryByLabelText("Quarantined blocks")).toBeNull();
    });
  });

  it("Retry — on success removes entry and calls onRetrySuccess", async () => {
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const onRetrySuccess = vi.fn();
    const importAuthoredBlock = vi.fn().mockResolvedValue({
      ok: true,
      installedPath: "/cloud/generated-blocks/active/bad-import-block.tsx",
      violations: [],
    });
    const deps = makeDeps({ deleteFile, importAuthoredBlock });
    render(
      createElement(QuarantinePanel, {
        quarantineDir: QUARANTINE_DIR,
        deps,
        onRetrySuccess,
      }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Retry import for bad-import-block")).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText("Retry import for bad-import-block"));

    await waitFor(() => {
      expect(importAuthoredBlock).toHaveBeenCalledWith(
        `${QUARANTINE_DIR}/bad-import-block.tsx`,
      );
      expect(onRetrySuccess).toHaveBeenCalledTimes(1);
    });
    // Panel disappears after successful retry
    await waitFor(() => {
      expect(screen.queryByLabelText("Quarantined blocks")).toBeNull();
    });
  });

  it("Retry — on continued failure keeps entry and shows error message", async () => {
    const deps = makeDeps();
    render(createElement(QuarantinePanel, { quarantineDir: QUARANTINE_DIR, deps }));

    await waitFor(() => {
      expect(screen.getByLabelText("Retry import for bad-import-block")).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText("Retry import for bad-import-block"));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Retry failed");
    });
    // Entry still present
    expect(screen.getByText("bad-import-block")).toBeTruthy();
  });

  it("collapses and expands via the Show/Hide button", async () => {
    const deps = makeDeps();
    render(createElement(QuarantinePanel, { quarantineDir: QUARANTINE_DIR, deps }));

    await waitFor(() => {
      expect(screen.getByLabelText("Quarantined blocks")).toBeTruthy();
    });

    // Initially expanded — slug visible
    expect(screen.queryByText("bad-import-block")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    // After collapsing the slug should not be in the DOM
    expect(screen.queryByText("bad-import-block")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.queryByText("bad-import-block")).toBeTruthy();
  });
});

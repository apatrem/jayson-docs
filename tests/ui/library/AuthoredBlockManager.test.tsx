/**
 * Tests for AuthoredBlockManager (T-169).
 *
 * All IPC interactions are injected via deps — no Tauri mocking needed.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BlockPaletteItem } from "../../../src/editor/BlockPalette";
import { AuthoredBlockManager } from "../../../src/ui/library/AuthoredBlockManager";

afterEach(() => {
  cleanup();
});

const ROOT = "/Users/me/Dropbox";

/** Build a mock active BlockPaletteItem. */
function activeItem(slug: string): BlockPaletteItem {
  return {
    id: `authored:${slug}`,
    name: `${slug.replace(/-/g, " ")} (Authored)`,
    when: "",
    command: `insertAuthored_${slug}`,
    generated: true,
    folder: "active",
  };
}

/** Build a mock archived BlockPaletteItem. */
function archivedItem(slug: string): BlockPaletteItem {
  return { ...activeItem(slug), folder: "archived" };
}

/** Default no-op deps. */
function makeDeps(overrides: {
  entries?: BlockPaletteItem[];
  archiveBlock?: () => Promise<string>;
  restoreBlock?: () => Promise<string>;
  permanentlyDeleteBlock?: () => Promise<void>;
}) {
  return {
    loadEntries: vi.fn(() =>
      Promise.resolve(overrides.entries ?? []),
    ),
    archiveBlock: vi.fn(overrides.archiveBlock ?? (() => Promise.resolve("/new/path.tsx"))),
    restoreBlock: vi.fn(overrides.restoreBlock ?? (() => Promise.resolve("/new/path.tsx"))),
    permanentlyDeleteBlock: vi.fn(overrides.permanentlyDeleteBlock ?? (() => Promise.resolve())),
  };
}

describe("AuthoredBlockManager", () => {
  describe("empty state", () => {
    it("renders nothing when no entries exist", async () => {
      const deps = makeDeps({ entries: [] });
      const { container } = render(
        <AuthoredBlockManager cloudSyncRoot={ROOT} deps={deps} />,
      );
      await waitFor(() => {
        expect(deps.loadEntries).toHaveBeenCalledWith(ROOT);
      });
      expect(container.firstChild).toBeNull();
    });
  });

  describe("active blocks", () => {
    it("renders active blocks under the Active section", async () => {
      const deps = makeDeps({ entries: [activeItem("risk-matrix")] });
      render(<AuthoredBlockManager cloudSyncRoot={ROOT} deps={deps} />);

      await screen.findByText(/risk matrix \(authored\)/i);
      expect(screen.getByLabelText(/active blocks/i)).toBeTruthy();
    });

    it("shows Archive button for active blocks", async () => {
      const deps = makeDeps({ entries: [activeItem("risk-matrix")] });
      render(<AuthoredBlockManager cloudSyncRoot={ROOT} deps={deps} />);

      await screen.findByText(/risk matrix \(authored\)/i);
      expect(
        screen.getByRole("button", { name: /archive authored:risk-matrix/i }),
      ).toBeTruthy();
    });

    it("Archive button calls archiveBlock and updates entry to archived", async () => {
      const deps = makeDeps({ entries: [activeItem("risk-matrix")] });
      const onBlocksChanged = vi.fn();
      render(
        <AuthoredBlockManager
          cloudSyncRoot={ROOT}
          deps={deps}
          onBlocksChanged={onBlocksChanged}
        />,
      );

      const button = await screen.findByRole("button", {
        name: /archive authored:risk-matrix/i,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(deps.archiveBlock).toHaveBeenCalledWith(
          `${ROOT}/generated-blocks/active/risk-matrix.tsx`,
          `${ROOT}/generated-blocks/archived`,
        );
      });
      await waitFor(() => {
        expect(onBlocksChanged).toHaveBeenCalledTimes(1);
      });
      // Entry moves to archived section
      await screen.findByLabelText(/archived blocks/i);
    });

    it("shows action error when archiveBlock fails", async () => {
      const deps = makeDeps({
        entries: [activeItem("risk-matrix")],
        archiveBlock: () => Promise.reject(new Error("permission denied")),
      });
      render(<AuthoredBlockManager cloudSyncRoot={ROOT} deps={deps} />);

      const button = await screen.findByRole("button", {
        name: /archive authored:risk-matrix/i,
      });
      fireEvent.click(button);

      await screen.findByRole("alert");
      expect(screen.getByRole("alert").textContent).toContain("permission denied");
    });
  });

  describe("archived blocks", () => {
    it("renders archived blocks under the Archived section", async () => {
      const deps = makeDeps({ entries: [archivedItem("old-block")] });
      render(<AuthoredBlockManager cloudSyncRoot={ROOT} deps={deps} />);

      await screen.findByLabelText(/archived blocks/i);
      expect(screen.getByText(/old block \(authored\)/i)).toBeTruthy();
    });

    it("shows Restore and Delete buttons for archived blocks", async () => {
      const deps = makeDeps({ entries: [archivedItem("old-block")] });
      render(<AuthoredBlockManager cloudSyncRoot={ROOT} deps={deps} />);

      await screen.findByLabelText(/archived blocks/i);
      expect(
        screen.getByRole("button", { name: /restore authored:old-block/i }),
      ).toBeTruthy();
      expect(
        screen.getByRole("button", { name: /permanently delete authored:old-block/i }),
      ).toBeTruthy();
    });

    it("Restore button calls restoreBlock and moves entry to active", async () => {
      const deps = makeDeps({ entries: [archivedItem("old-block")] });
      const onBlocksChanged = vi.fn();
      render(
        <AuthoredBlockManager
          cloudSyncRoot={ROOT}
          deps={deps}
          onBlocksChanged={onBlocksChanged}
        />,
      );

      const button = await screen.findByRole("button", {
        name: /restore authored:old-block/i,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(deps.restoreBlock).toHaveBeenCalledWith(
          `${ROOT}/generated-blocks/archived/old-block.tsx`,
          `${ROOT}/generated-blocks/active`,
        );
      });
      await waitFor(() => {
        expect(onBlocksChanged).toHaveBeenCalledTimes(1);
      });
      await screen.findByLabelText(/active blocks/i);
    });

    it("permanently-delete confirms and removes entry on success", async () => {
      const deps = makeDeps({ entries: [archivedItem("old-block")] });
      const confirmSpy = vi
        .spyOn(window, "confirm")
        .mockReturnValue(true);
      const onBlocksChanged = vi.fn();

      render(
        <AuthoredBlockManager
          cloudSyncRoot={ROOT}
          deps={deps}
          onBlocksChanged={onBlocksChanged}
        />,
      );

      const button = await screen.findByRole("button", {
        name: /permanently delete authored:old-block/i,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(deps.permanentlyDeleteBlock).toHaveBeenCalledWith(
          `${ROOT}/generated-blocks/archived/old-block.tsx`,
        );
      });
      await waitFor(() => {
        expect(onBlocksChanged).toHaveBeenCalledTimes(1);
      });
      // Panel disappears (no more entries)
      await waitFor(() => {
        expect(screen.queryByLabelText(/archived blocks/i)).toBeNull();
      });
      confirmSpy.mockRestore();
    });

    it("permanently-delete cancellation does not call permanentlyDeleteBlock", async () => {
      const deps = makeDeps({ entries: [archivedItem("old-block")] });
      const confirmSpy = vi
        .spyOn(window, "confirm")
        .mockReturnValue(false);

      render(<AuthoredBlockManager cloudSyncRoot={ROOT} deps={deps} />);
      const button = await screen.findByRole("button", {
        name: /permanently delete authored:old-block/i,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledTimes(1);
      });
      expect(deps.permanentlyDeleteBlock).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it("permanently-delete warning includes open-doc count when >0", async () => {
      const deps = makeDeps({ entries: [archivedItem("old-block")] });
      const confirmSpy = vi
        .spyOn(window, "confirm")
        .mockReturnValue(false);
      // Block type "alice@example.com:old-block" is in the open doc
      const openDocBlockTypes = new Set(["alice@example.com:old-block"]);

      render(
        <AuthoredBlockManager
          cloudSyncRoot={ROOT}
          deps={deps}
          openDocBlockTypes={openDocBlockTypes}
        />,
      );
      const button = await screen.findByRole("button", {
        name: /permanently delete authored:old-block/i,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(confirmSpy).toHaveBeenCalledTimes(1);
      });
      const message = confirmSpy.mock.calls[0]?.[0] ?? "";
      expect(message).toContain("1 open document");
      confirmSpy.mockRestore();
    });
  });

  describe("collapse / expand", () => {
    it("collapses the panel when Hide is clicked", async () => {
      const deps = makeDeps({ entries: [activeItem("block-a")] });
      render(<AuthoredBlockManager cloudSyncRoot={ROOT} deps={deps} />);

      await screen.findByText(/block a \(authored\)/i);
      const toggle = screen.getByRole("button", { name: /hide/i });
      fireEvent.click(toggle);

      expect(screen.queryByText(/block a \(authored\)/i)).toBeNull();
      expect(screen.getByRole("button", { name: /show/i })).toBeTruthy();
    });
  });
});

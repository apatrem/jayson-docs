import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { FolderPickerScreen } from "../../../src/ui/install/FolderPickerScreen";
import type { RouteIntent } from "../../../src/ui/router/types";

function makeDispatch() {
  return vi.fn((_intent: RouteIntent) => undefined);
}

const writeAppConfig = vi.fn(() => Promise.resolve());
const selectFolder = vi.fn(() => Promise.resolve("/Users/me/Documents" as string | null));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FolderPickerScreen — first-launch", () => {
  it("renders the first-launch heading", () => {
    render(
      createElement(FolderPickerScreen, {
        reason: "first-launch",
        dispatch: makeDispatch(),
        deps: { selectFolder, writeAppConfig },
      }),
    );

    expect(screen.getByText("Choose where your documents are saved")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose Folder…" })).toBeTruthy();
  });

  it("pick → writes config → dispatches back-to-library", async () => {
    const dispatch = makeDispatch();
    render(
      createElement(FolderPickerScreen, {
        reason: "first-launch",
        dispatch,
        deps: { selectFolder, writeAppConfig },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose Folder…" }));

    await waitFor(() => {
      expect(writeAppConfig).toHaveBeenCalledWith({
        paths: { cloudSyncRoot: "/Users/me/Documents" },
      });
    });
    expect(dispatch).toHaveBeenCalledWith({ intent: "back-to-library" });
  });

  it("cancel (null path) → stays on screen, does not write config", async () => {
    const dispatch = makeDispatch();
    const cancelFolder = vi.fn(() => Promise.resolve(null as string | null));
    render(
      createElement(FolderPickerScreen, {
        reason: "first-launch",
        dispatch,
        deps: { selectFolder: cancelFolder, writeAppConfig },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose Folder…" }));

    await waitFor(() => {
      expect(cancelFolder).toHaveBeenCalled();
    });
    expect(writeAppConfig).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Choose Folder…" })).toBeTruthy();
  });
});

describe("FolderPickerScreen — missing-folder", () => {
  it("renders the missing-folder heading", () => {
    render(
      createElement(FolderPickerScreen, {
        reason: "missing",
        dispatch: makeDispatch(),
        deps: { selectFolder, writeAppConfig },
      }),
    );

    expect(
      screen.getByText(
        "Your documents folder isn't where it used to be. Choose a new location.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Choose Folder…" })).toBeTruthy();
  });

  it("pick → writes config → dispatches back-to-library (missing reason)", async () => {
    const dispatch = makeDispatch();
    render(
      createElement(FolderPickerScreen, {
        reason: "missing",
        dispatch,
        deps: { selectFolder, writeAppConfig },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Choose Folder…" }));

    await waitFor(() => {
      expect(writeAppConfig).toHaveBeenCalledWith({
        paths: { cloudSyncRoot: "/Users/me/Documents" },
      });
    });
    expect(dispatch).toHaveBeenCalledWith({ intent: "back-to-library" });
  });
});

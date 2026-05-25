import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ReviewModeToggle,
  createMemoryReviewModeStore,
  type ReviewMode,
} from "../../src/ui/ReviewModeToggle";

describe("ReviewModeToggle", () => {
  afterEach(() => {
    cleanup();
  });

  it("cycles modes and persists the consultant preference", async () => {
    const changes: ReviewMode[] = [];
    const store = createMemoryReviewModeStore("inline");

    render(
      <ReviewModeToggle
        defaultMode="panel"
        store={store}
        onChange={(mode) => changes.push(mode)}
      />,
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Inline review" })
          .getAttribute("aria-pressed"),
      ).toBe("true");
    });

    fireEvent.click(screen.getByRole("button", { name: "Diff review" }));
    expect(changes).toEqual(["diff"]);
    await expect(Promise.resolve(store.getReviewMode())).resolves.toBe("diff");
  });

  it("cycles with cmd+shift+r without losing state", () => {
    const changes: ReviewMode[] = [];

    render(
      <ReviewModeToggle
        defaultMode="panel"
        store={createMemoryReviewModeStore()}
        onChange={(mode) => changes.push(mode)}
      />,
    );

    const group = screen.getByRole("group", { name: "Review mode" });
    fireEvent.keyDown(group, { key: "R", metaKey: true, shiftKey: true });

    expect(changes).toEqual(["inline"]);
    expect(
      screen.getByRole("button", { name: "Inline review" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });
});

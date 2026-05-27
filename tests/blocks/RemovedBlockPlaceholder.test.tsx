/**
 * Tests for RemovedBlockPlaceholder (T-168).
 *
 * This component renders in place of Authored blocks that have been
 * permanently deleted from disk.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RemovedBlockPlaceholder } from "../../src/blocks/RemovedBlockPlaceholder";

afterEach(() => {
  cleanup();
});

describe("RemovedBlockPlaceholder", () => {
  it("renders a note region with the block type", () => {
    render(
      <RemovedBlockPlaceholder blockType="alice@consulting.example:sector-risk-summary" />,
    );

    const note = screen.getByRole("note");
    expect(note).toBeTruthy();
    expect(note.getAttribute("aria-label")).toContain(
      "alice@consulting.example:sector-risk-summary",
    );
  });

  it("shows a human-readable title derived from the slug", () => {
    render(
      <RemovedBlockPlaceholder blockType="alice@consulting.example:sector-risk-summary" />,
    );
    // slug "sector-risk-summary" → "Sector Risk Summary block removed"
    expect(screen.getByText(/sector risk summary block removed/i)).toBeTruthy();
  });

  it("shows the sender email", () => {
    render(
      <RemovedBlockPlaceholder blockType="alice@consulting.example:sector-risk-summary" />,
    );
    expect(screen.getByText(/alice@consulting\.example/i)).toBeTruthy();
  });

  it("handles an unrecognised (non-authored) type string gracefully", () => {
    // Should not throw — just shows the raw type as the name.
    render(<RemovedBlockPlaceholder blockType="callout" />);
    const note = screen.getByRole("note");
    expect(note).toBeTruthy();
    expect(screen.getByText(/callout block removed/i)).toBeTruthy();
  });

  it("does not show a sender line for non-authored type strings", () => {
    render(<RemovedBlockPlaceholder blockType="callout" />);
    expect(screen.queryByText(/originally from/i)).toBeNull();
  });

  it("shows a recovery hint", () => {
    render(
      <RemovedBlockPlaceholder blockType="alice@consulting.example:risk-overview" />,
    );
    expect(screen.getByText(/permanently deleted/i)).toBeTruthy();
  });
});

/**
 * Tests for the BlockPalette component (T-171).
 *
 * Covers the "Create new Authored block" trigger surface:
 *   - The Create button is always rendered.
 *   - Clicking it calls onCreateAuthoredBlock.
 *   - It is disabled when no callback is provided.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BlockPalette, type BlockPaletteItem } from "../../src/editor/BlockPalette";

afterEach(() => {
  cleanup();
});

const nullEditor = null;

/** An active Authored block item for testing the generated-block list. */
const authoredItem: BlockPaletteItem = {
  id: "authored:competitive-matrix",
  name: "Competitive Matrix (Authored)",
  when: "",
  command: "insertAuthored_competitive-matrix",
  generated: true,
  folder: "active",
};

describe("BlockPalette — Create new Authored block trigger", () => {
  it("renders the Create new Authored block button", () => {
    render(<BlockPalette editor={nullEditor} />);
    expect(
      screen.getByRole("button", { name: /create new authored block/i }),
    ).toBeTruthy();
  });

  it("the Create button is disabled when no onCreateAuthoredBlock prop is given", () => {
    render(<BlockPalette editor={nullEditor} />);
    const button = screen.getByRole("button", { name: /create new authored block/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("the Create button is enabled when onCreateAuthoredBlock is provided", () => {
    const onCreate = vi.fn();
    render(<BlockPalette editor={nullEditor} onCreateAuthoredBlock={onCreate} />);
    const button = screen.getByRole("button", { name: /create new authored block/i });
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("clicking the Create button calls onCreateAuthoredBlock", () => {
    const onCreate = vi.fn();
    render(<BlockPalette editor={nullEditor} onCreateAuthoredBlock={onCreate} />);
    fireEvent.click(screen.getByRole("button", { name: /create new authored block/i }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it("the Create button appears below standard and generated-block items", () => {
    render(
      <BlockPalette
        editor={nullEditor}
        generatedBlocks={[authoredItem]}
        onCreateAuthoredBlock={vi.fn()}
      />,
    );
    // Both the generated block and the Create button are rendered.
    expect(screen.getByText(/competitive matrix \(authored\)/i)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /create new authored block/i }),
    ).toBeTruthy();
  });

  it("archived Authored blocks are not shown alongside the Create button", () => {
    const archivedItem: BlockPaletteItem = {
      ...authoredItem,
      id: "authored:old-block",
      name: "Old Block (Authored)",
      folder: "archived",
    };
    render(
      <BlockPalette
        editor={nullEditor}
        generatedBlocks={[archivedItem]}
        onCreateAuthoredBlock={vi.fn()}
      />,
    );
    expect(screen.queryByText(/old block \(authored\)/i)).toBeNull();
    // Create button is still rendered.
    expect(
      screen.getByRole("button", { name: /create new authored block/i }),
    ).toBeTruthy();
  });
});

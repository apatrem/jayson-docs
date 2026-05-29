import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SectionSidebar } from "../../../src/ui/views/SectionSidebar";

const sections = [
  { id: "a", title: "Alpha" },
  { id: "b", title: "Beta" },
];

function setup(overrides: Partial<Parameters<typeof SectionSidebar>[0]> = {}) {
  const props = {
    sections,
    onJump: vi.fn(),
    onRename: vi.fn(),
    onReorder: vi.fn(),
    onCreate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<SectionSidebar {...props} />);
  return props;
}

afterEach(cleanup);

describe("SectionSidebar (ADR-0018, item 1)", () => {
  it("jumps when a section title is clicked", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Alpha" }));
    expect(props.onJump).toHaveBeenCalledWith("a");
  });

  it("creates a section after the last when Add is clicked", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Add section" }));
    expect(props.onCreate).toHaveBeenCalledWith(1);
  });

  it("deletes a section", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete section Beta" }));
    expect(props.onDelete).toHaveBeenCalledWith("b");
  });

  it("renames via double-click + Enter", () => {
    const props = setup();
    fireEvent.doubleClick(screen.getByRole("button", { name: "Alpha" }));
    const input = screen.getByRole("textbox", { name: "Section title" });
    fireEvent.change(input, { target: { value: "Intro" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(props.onRename).toHaveBeenCalledWith("a", "Intro");
  });

  it("collapses and expands the section list", () => {
    setup();
    expect(screen.getByRole("button", { name: "Alpha" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sections" }));
    expect(screen.queryByRole("button", { name: "Alpha" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Expand sections" }));
    expect(screen.getByRole("button", { name: "Alpha" })).toBeTruthy();
  });

  it("disables delete when only one section remains", () => {
    setup({ sections: [{ id: "only", title: "Solo" }] });
    expect(
      screen.getByRole("button", { name: "Delete section Solo" }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("shows a placeholder for an untitled section", () => {
    setup({ sections: [{ id: "x", title: undefined }] });
    expect(screen.getByRole("button", { name: "Untitled section" })).toBeTruthy();
  });
});

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentSettingsDialog } from "../../../src/ui/views/DocumentSettingsDialog";
import type { Meta } from "../../../src/schema/meta";

const baseMeta: Meta = {
  client: "Acme",
  project: "Project X",
  docKind: "report",
  tags: [],
  language: "en",
  status: "draft",
  archived: false,
  confidentialityLevel: "medium",
  owner: "owner@example.com",
  reviewers: [],
  createdAt: "2026-05-26T00:00:00Z",
  updatedAt: "2026-05-26T00:00:00Z",
  brandRef: "$brand:default",
};

afterEach(cleanup);

describe("DocumentSettingsDialog (ADR-0018, item 6)", () => {
  it("writes a block-spacing override into meta.layout on apply", () => {
    const onApply = vi.fn();
    render(
      <DocumentSettingsDialog meta={baseMeta} onApply={onApply} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const next = onApply.mock.calls[0]?.[0] as Meta;
    expect(next.layout?.blockSpacing).toBe(5);
    // Other metadata is preserved.
    expect(next.client).toBe("Acme");
    expect(next.brandRef).toBe("$brand:default");
  });

  it("omits meta.layout entirely when everything is at its default", () => {
    const onApply = vi.fn();
    render(
      <DocumentSettingsDialog meta={baseMeta} onApply={onApply} onClose={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    const next = onApply.mock.calls[0]?.[0] as Meta;
    expect(next.layout).toBeUndefined();
  });

  it("edits a metadata field and applies it", () => {
    const onApply = vi.fn();
    render(
      <DocumentSettingsDialog meta={baseMeta} onApply={onApply} onClose={vi.fn()} />,
    );
    fireEvent.change(screen.getByDisplayValue("Project X"), {
      target: { value: "Renamed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect((onApply.mock.calls[0]?.[0] as Meta).project).toBe("Renamed");
  });

  it("closes without applying when Cancel is clicked", () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    render(
      <DocumentSettingsDialog meta={baseMeta} onApply={onApply} onClose={onClose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

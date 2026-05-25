import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "../../src/editor/Editor";
import type { DocModel } from "../../src/schema/docmodel";

const deck: Extract<DocModel, { kind: "deck" }> = {
  kind: "deck",
  schemaVersion: "1.0.0",
  meta: {
    client: "Acme",
    project: "Deck editor test",
    docKind: "deck",
    tags: [],
    language: "en",
    status: "draft",
    archived: false,
    confidentialityLevel: "medium",
    owner: "owner@example.com",
    reviewers: [],
    createdAt: "2026-05-25T00:00:00Z",
    updatedAt: "2026-05-25T00:00:00Z",
    brandRef: "$brand:default",
  },
  slides: [
    {
      id: "slide-cover",
      layout: "cover",
      blocks: [],
    },
    {
      id: "slide-agenda",
      layout: "agenda",
      blocks: [
        {
          id: "agenda-heading",
          type: "heading",
          level: 1,
          text: "Agenda",
          numbered: false,
        },
      ],
    },
  ],
  comments: [],
};

describe("Editor deck navigation", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a vertical slide strip and switches the current-slide focus area", () => {
    render(<Editor docModel={deck} editable={false} />);

    expect(screen.getByLabelText("Slide navigation")).toBeTruthy();
    expect(
      screen
        .getByLabelText("Current slide")
        .getAttribute("data-current-slide-id"),
    ).toBe("slide-cover");
    expect(screen.getByText("Slide 1 of 2 · cover")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Slide 2 agenda" }));

    expect(
      screen
        .getByLabelText("Current slide")
        .getAttribute("data-current-slide-id"),
    ).toBe("slide-agenda");
    expect(screen.getByText("Slide 2 of 2 · agenda")).toBeTruthy();
  });
});

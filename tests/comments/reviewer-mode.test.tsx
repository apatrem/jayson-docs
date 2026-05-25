import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReviewerMode } from "../../src/comments/ReviewerMode";
import type { Comment } from "../../src/schema/comment";
import type { DocModel } from "../../src/schema/docmodel";

const doc: DocModel = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: {
    client: "Acme",
    project: "Reviewer test",
    docKind: "proposal",
    tags: [],
    language: "en",
    status: "in-review",
    archived: false,
    confidentialityLevel: "medium",
    owner: "jane@example.com",
    reviewers: ["reviewer@example.com"],
    createdAt: "2026-05-25T12:00:00Z",
    updatedAt: "2026-05-25T12:00:00Z",
    brandRef: "$brand:default",
  },
  sections: [
    {
      id: "section-1",
      title: "Executive summary",
      blocks: [],
    },
  ],
  comments: [],
};

describe("ReviewerMode", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the document read-only and creates reviewer comments only", () => {
    let editable: boolean | undefined;
    let created: Comment | undefined;

    render(
      <ReviewerMode
        doc={doc}
        reviewer={{ name: "Pat Reviewer", email: "reviewer@example.com" }}
        selection={{
          blockId: "block-a",
          from: 0,
          to: 4,
          quotedText: "text",
        }}
        generateId={() => "comment-reviewer"}
        now={() => new Date("2026-05-25T12:05:00Z")}
        renderDocument={({ editable: isEditable }) => {
          editable = isEditable;
          return <div>Rendered document</div>;
        }}
        onCreateComment={(comment) => {
          created = comment;
        }}
      />,
    );

    expect(editable).toBe(false);
    expect(screen.queryByRole("button", { name: "Process all" })).toBeNull();

    fireEvent.change(screen.getByLabelText("AI instruction"), {
      target: { value: "Please clarify this." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create comment" }));

    expect(created?.thread[0]).toMatchObject({
      kind: "instruction",
      author: "Pat Reviewer",
      authorEmail: "reviewer@example.com",
      authorRole: "reviewer",
      text: "Please clarify this.",
    });
  });
});

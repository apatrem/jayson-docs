import type { CSSProperties, FC, ReactNode } from "react";
import {
  CreateComment,
  type CommentSelection,
  type CommentAuthor,
} from "./CreateComment";
import type { Comment } from "../schema/comment";
import type { DocModel } from "../schema/docmodel";

export interface ReviewerIdentity {
  name: string;
  email: string;
}

export interface ReviewerModeProps {
  doc: DocModel;
  reviewer: ReviewerIdentity;
  selection: CommentSelection | null;
  onCreateComment: (comment: Comment) => void;
  renderDocument?: ((input: { doc: DocModel; editable: false }) => ReactNode) | undefined;
  generateId?: (() => string) | undefined;
  now?: (() => Date) | undefined;
}

export const ReviewerMode: FC<ReviewerModeProps> = ({
  doc,
  reviewer,
  selection,
  onCreateComment,
  renderDocument = defaultRenderDocument,
  generateId,
  now,
}) => {
  const reviewerAuthor: CommentAuthor = {
    name: reviewer.name,
    email: reviewer.email,
    role: "reviewer",
  };

  return (
    <section aria-label="Reviewer mode" style={styles.shell}>
      <div aria-label="Read-only document" aria-readonly="true" style={styles.document}>
        {renderDocument({ doc, editable: false })}
      </div>
      <CreateComment
        selection={selection}
        author={reviewerAuthor}
        onCreate={onCreateComment}
        {...(generateId === undefined ? {} : { generateId })}
        {...(now === undefined ? {} : { now })}
      />
    </section>
  );
};

const defaultRenderDocument = ({ doc }: { doc: DocModel; editable: false }) => (
  <article>
    <h1>{doc.meta.project}</h1>
    <p>{doc.kind === "document" ? doc.sections.length : doc.slides.length} containers</p>
  </article>
);

const styles: Record<string, CSSProperties> = {
  shell: {
    display: "grid",
    gap: "1rem",
  },
  document: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    padding: "1rem",
  },
};

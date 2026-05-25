import type { CSSProperties, FC } from "react";
import { extractPlainText } from "./DiffPreview";
import { buildReviewProposals } from "./ReviewPanel";
import type { ProposalUiState, ReviewProposal } from "./ProposalCard";
import type { Comment } from "../schema/comment";
import type { DocModel } from "../schema/docmodel";

export interface InlineReviewProps {
  doc: DocModel;
  comments: Comment[];
  uiState?: Record<string, Partial<ProposalUiState>>;
  onAccept?: ((proposal: ReviewProposal) => void) | undefined;
  onReject?: ((proposal: ReviewProposal) => void) | undefined;
}

export const InlineReview: FC<InlineReviewProps> = ({
  doc,
  comments,
  uiState = {},
  onAccept,
  onReject,
}) => {
  const proposals = buildReviewProposals(doc, comments, uiState);

  if (proposals.length === 0) {
    return <p style={styles.empty}>No inline proposals pending.</p>;
  }

  return (
    <section aria-label="Inline review" style={styles.inlineReview}>
      {proposals.map((proposal) => (
        <InlineProposal
          key={proposal.comment.id}
          proposal={proposal}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </section>
  );
};

const InlineProposal: FC<{
  proposal: ReviewProposal;
  onAccept?: ((proposal: ReviewProposal) => void) | undefined;
  onReject?: ((proposal: ReviewProposal) => void) | undefined;
}> = ({ proposal, onAccept, onReject }) => {
  const before = extractPlainText(proposal.currentBlock);
  const patch = proposal.patch;
  const after =
    patch === null || patch.op === "remove"
      ? ""
      : extractPlainText(patch.block);

  return (
    <article
      aria-label={`Inline proposal ${proposal.comment.id}`}
      style={styles.proposal}
    >
      <header style={styles.header}>
        <strong>{proposal.location}</strong>
        <span>{proposal.blockType}</span>
      </header>
      <p style={styles.line}>
        {patch?.op === "insert-after" ? null : (
          <span data-diff="removed" style={styles.removed}>
            {before || proposal.comment.quotedText}
          </span>
        )}
        {patch?.op === "remove" ? null : (
          <span data-diff="added" style={styles.added}>
            {after}
          </span>
        )}
      </p>
      <div aria-label={`Inline controls for ${proposal.comment.id}`} style={styles.pills}>
        <button
          type="button"
          disabled={onAccept === undefined}
          onClick={() => onAccept?.(proposal)}
        >
          Accept inline proposal for {proposal.comment.id}
        </button>
        <button
          type="button"
          disabled={onReject === undefined}
          onClick={() => onReject?.(proposal)}
        >
          Reject inline proposal for {proposal.comment.id}
        </button>
      </div>
    </article>
  );
};

const styles: Record<string, CSSProperties> = {
  inlineReview: {
    display: "grid",
    gap: "0.75rem",
  },
  proposal: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    display: "grid",
    gap: "0.5rem",
    padding: "0.75rem",
    position: "relative",
  },
  header: {
    display: "flex",
    gap: "0.5rem",
  },
  line: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.375rem",
    margin: 0,
  },
  removed: {
    opacity: 0.72,
    textDecoration: "line-through",
  },
  added: {
    fontWeight: 700,
    textDecoration: "underline",
  },
  pills: {
    display: "flex",
    gap: "0.5rem",
  },
  empty: {
    margin: 0,
  },
};

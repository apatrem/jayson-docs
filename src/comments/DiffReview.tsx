import type { CSSProperties, FC, KeyboardEvent } from "react";
import { useState } from "react";
import { extractPlainText } from "./DiffPreview";
import type { ProposalUiState, ReviewProposal } from "./ProposalCard";
import { buildReviewProposals } from "./ReviewPanel";
import type { Comment } from "../schema/comment";
import type { DocModel } from "../schema/docmodel";

export interface DiffReviewProps {
  doc: DocModel;
  comments: Comment[];
  uiState?: Record<string, Partial<ProposalUiState>>;
  onAccept?: ((proposal: ReviewProposal) => void) | undefined;
  onReject?: ((proposal: ReviewProposal) => void) | undefined;
}

export const DiffReview: FC<DiffReviewProps> = ({
  doc,
  comments,
  uiState = {},
  onAccept,
  onReject,
}) => {
  const proposals = buildReviewProposals(doc, comments, uiState);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeProposal = proposals[activeIndex] ?? null;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (proposals.length === 0) {
      return;
    }
    switch (event.key) {
      case "j":
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, proposals.length - 1));
        break;
      case "k":
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter":
      case "y":
        event.preventDefault();
        if (activeProposal !== null) {
          onAccept?.(activeProposal);
        }
        break;
      case "Delete":
      case "n":
        event.preventDefault();
        if (activeProposal !== null) {
          onReject?.(activeProposal);
        }
        break;
    }
  };

  if (activeProposal === null) {
    return <p style={styles.empty}>No diff proposals pending.</p>;
  }

  return (
    <section
      role="region"
      aria-label="Two-pane diff review"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={styles.shell}
    >
      <header style={styles.header}>
        <h2 style={styles.title}>
          Proposal {activeIndex + 1} of {proposals.length}
        </h2>
        <span>{activeProposal.location}</span>
      </header>

      <div style={styles.panes}>
        <Pane title="Current block" text={currentText(activeProposal)} />
        <Pane title="Proposed block" text={proposedText(activeProposal)} />
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          disabled={onAccept === undefined}
          onClick={() => onAccept?.(activeProposal)}
        >
          Accept proposal
        </button>
        <button
          type="button"
          disabled={onReject === undefined}
          onClick={() => onReject?.(activeProposal)}
        >
          Reject proposal
        </button>
      </div>
    </section>
  );
};

const Pane: FC<{ title: string; text: string }> = ({ title, text }) => (
  <section aria-label={title} style={styles.pane}>
    <h3 style={styles.paneTitle}>{title}</h3>
    <p style={styles.text}>{text}</p>
  </section>
);

function currentText(proposal: ReviewProposal): string {
  return extractPlainText(proposal.currentBlock) || proposal.comment.quotedText;
}

function proposedText(proposal: ReviewProposal): string {
  const patch = proposal.patch;
  if (patch === null) {
    return "No valid AI proposal.";
  }
  if (patch.op === "remove") {
    return "This block will be deleted.";
  }
  return extractPlainText(patch.block);
}

const styles: Record<string, CSSProperties> = {
  shell: {
    display: "grid",
    gap: "0.75rem",
  },
  header: {
    alignItems: "center",
    display: "flex",
    gap: "0.75rem",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "1rem",
    margin: 0,
  },
  panes: {
    display: "grid",
    gap: "0.75rem",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  pane: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    display: "grid",
    gap: "0.5rem",
    padding: "0.75rem",
  },
  paneTitle: {
    fontSize: "0.875rem",
    margin: 0,
  },
  text: {
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  actions: {
    display: "flex",
    gap: "0.5rem",
    justifyContent: "flex-end",
  },
  empty: {
    margin: 0,
  },
};

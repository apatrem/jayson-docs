import { applyPatch } from "../docmodel/patch";
import type { Comment, ThreadEntry } from "../schema/comment";
import type { DocModel } from "../schema/docmodel";

export interface ApplyCommentOptions {
  now?: (() => string) | undefined;
  runAsSeparateUndoStep?: ((operation: () => void) => void) | undefined;
}

export class ApplyCommentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplyCommentError";
  }
}

export function acceptCommentProposal(
  doc: DocModel,
  comment: Comment,
  options: ApplyCommentOptions = {},
): DocModel {
  return runUndoBounded(options, () => {
    const proposal = latestProposal(comment);
    const patched = applyPatch(doc, proposal.patch);
    return withCommentStatus(patched, comment, "applied", timestamp(options));
  });
}

export function rejectCommentProposal(
  doc: DocModel,
  comment: Comment,
  options: ApplyCommentOptions = {},
): DocModel {
  return runUndoBounded(options, () =>
    withCommentStatus(doc, comment, "rejected", timestamp(options)),
  );
}

function latestProposal(comment: Comment): Extract<
  ThreadEntry,
  { kind: "ai-proposal" }
> {
  for (let index = comment.thread.length - 1; index >= 0; index -= 1) {
    const entry = comment.thread[index];
    if (entry?.kind === "ai-proposal") {
      return entry;
    }
  }
  throw new ApplyCommentError(`Comment '${comment.id}' has no AI proposal.`);
}

function withCommentStatus(
  doc: DocModel,
  comment: Comment,
  status: Extract<Comment["status"], "applied" | "rejected">,
  updatedAt: string,
): DocModel {
  const updatedComment: Comment = {
    ...comment,
    status,
    updatedAt,
  };
  const comments = doc.comments.some((candidate) => candidate.id === comment.id)
    ? doc.comments.map((candidate) =>
        candidate.id === comment.id ? updatedComment : candidate,
      )
    : [...doc.comments, updatedComment];

  return {
    ...doc,
    comments,
  };
}

function runUndoBounded(
  options: ApplyCommentOptions,
  operation: () => DocModel,
): DocModel {
  if (options.runAsSeparateUndoStep === undefined) {
    return operation();
  }

  let result: DocModel | null = null;
  options.runAsSeparateUndoStep(() => {
    result = operation();
  });
  if (result === null) {
    throw new ApplyCommentError("Undo-bounded operation did not run.");
  }
  return result;
}

function timestamp(options: ApplyCommentOptions): string {
  return options.now?.() ?? new Date().toISOString();
}

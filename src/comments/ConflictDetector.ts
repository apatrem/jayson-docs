import type { Comment, ThreadEntry } from "../schema/comment";

export type ConflictMap = Record<string, string[]>;

interface TargetRange {
  commentId: string;
  blockId: string;
  from: number;
  to: number;
}

const WHOLE_BLOCK_FROM = 0;
const WHOLE_BLOCK_TO = Number.MAX_SAFE_INTEGER;

export function detectCommentConflicts(comments: Comment[]): ConflictMap {
  const targets = comments
    .filter((comment) => comment.status === "open" && latestProposal(comment) !== null)
    .map(commentToTarget);
  const conflicts: ConflictMap = {};

  for (let leftIndex = 0; leftIndex < targets.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < targets.length; rightIndex += 1) {
      const left = targets[leftIndex];
      const right = targets[rightIndex];
      if (left === undefined || right === undefined) {
        continue;
      }
      if (left.blockId === right.blockId && rangesOverlap(left, right)) {
        conflicts[left.commentId] = [
          ...(conflicts[left.commentId] ?? []),
          right.commentId,
        ];
        conflicts[right.commentId] = [
          ...(conflicts[right.commentId] ?? []),
          left.commentId,
        ];
      }
    }
  }

  return conflicts;
}

function commentToTarget(comment: Comment): TargetRange {
  return {
    commentId: comment.id,
    blockId: comment.blockId,
    from: comment.range?.from ?? WHOLE_BLOCK_FROM,
    to: comment.range?.to ?? WHOLE_BLOCK_TO,
  };
}

function rangesOverlap(left: TargetRange, right: TargetRange): boolean {
  return left.from < right.to && right.from < left.to;
}

function latestProposal(comment: Comment): Extract<
  ThreadEntry,
  { kind: "ai-proposal" }
> | null {
  for (let index = comment.thread.length - 1; index >= 0; index -= 1) {
    const entry = comment.thread[index];
    if (entry?.kind === "ai-proposal") {
      return entry;
    }
  }
  return null;
}

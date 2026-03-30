import { useState, useEffect, useMemo } from 'react';
import type {
  PRReview,
  PRComment,
  PRReviewInlineComment,
} from '@lgtmai/backend/types';
import { ReviewCard } from '../ReviewList/components';
import { CommentCard } from './components/CommentCard';
import {
  useActivityChat,
  type ValidationState,
  type ValidationTarget,
} from './hooks/useActivityChat';

interface Props {
  reviews: PRReview[];
  comments: PRComment[];
  workingDir: string;
  projectId: string;
  prNumber: number;
}

type ActivityItem =
  | { kind: 'review'; date: string; item: PRReview }
  | { kind: 'comment'; date: string; item: PRComment };

export interface InlineThread {
  root: PRReviewInlineComment;
  replies: PRReviewInlineComment[];
}

/**
 * Builds a cross-review thread map: rootCommentId → InlineThread.
 * Replies may live in a different PRReview than their root, so we gather
 * all inline comments from every review first and then link by inReplyToId.
 */
function buildThreadMap(reviews: PRReview[]): Map<string, InlineThread> {
  const allComments = reviews.flatMap((r) => r.inlineComments);
  const byId = new Map(allComments.map((c) => [c.id, c]));

  const threads = new Map<string, InlineThread>();

  for (const comment of allComments) {
    // Walk up to find the root
    let rootId = comment.id;
    while (byId.get(rootId)?.inReplyToId) {
      rootId = byId.get(rootId)!.inReplyToId!;
    }

    if (!threads.has(rootId)) {
      const root = byId.get(rootId);
      if (root) threads.set(rootId, { root, replies: [] });
    }

    if (comment.id !== rootId) {
      threads.get(rootId)?.replies.push(comment);
    }
  }

  return threads;
}

export const ActivityTimeline = ({
  reviews,
  comments,
  workingDir,
  projectId,
  prNumber,
}: Props) => {
  const [validations, setValidations] = useState<
    Record<string, ValidationState>
  >({});
  const [activeTarget, setActiveTarget] = useState<ValidationTarget | null>(
    null
  );

  const { handleOpenChat, messages } = useActivityChat({
    workingDir,
    projectId,
    prNumber,
    setValidations,
    setActiveTarget,
  });

  // Build global thread map once across all reviews
  const threadMap = useMemo(() => buildThreadMap(reviews), [reviews]);

  useEffect(() => {
    if (!activeTarget) return;

    const isDone = messages.some((m) => m.type === 'done');
    if (isDone) {
      const textMessages = messages.filter((m) => m.type === 'text');
      const fullText = textMessages.map((m) => m.content).join('');
      const isValid =
        fullText.toUpperCase().includes('VALID') &&
        !fullText.toUpperCase().startsWith('INVALID');
      setValidations((prev) => ({
        ...prev,
        [activeTarget.id]: {
          status: isValid ? 'valid' : 'invalid',
          result: fullText.trim(),
        },
      }));
      setActiveTarget(null);
    }
  }, [messages, activeTarget]);

  // Exclude reviews that have no body and only contain reply inline comments
  // (their content is already shown nested under the root comment's review)
  const visibleReviews = reviews.filter((r) => {
    const hasBody = r.body.trim().length > 0;
    const hasRootInlineComment = r.inlineComments.some((c) => !c.inReplyToId);
    return hasBody || hasRootInlineComment;
  });

  const timeline: ActivityItem[] = [
    ...visibleReviews.map(
      (r): ActivityItem => ({ kind: 'review', date: r.submittedAt, item: r })
    ),
    ...comments.map(
      (c): ActivityItem => ({ kind: 'comment', date: c.createdAt, item: c })
    ),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (timeline.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Activity</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No activity yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Activity ({timeline.length})
      </h2>
      <div className="space-y-4">
        {timeline.map((entry) => {
          if (entry.kind === 'review') {
            const review = entry.item;
            // Only pass threads whose root belongs to this review
            const ownThreads = review.inlineComments
              .filter((c) => !c.inReplyToId)
              .map((c) => threadMap.get(c.id))
              .filter((t): t is InlineThread => t !== undefined);

            return (
              <ReviewCard
                key={`review-${review.id}`}
                review={review}
                threads={ownThreads}
                validations={validations}
                onChatReview={() =>
                  handleOpenChat({
                    type: 'review',
                    id: review.id,
                    body: review.body,
                    author: review.author.login,
                  })
                }
                onChatComment={(comment) =>
                  handleOpenChat({
                    type: 'comment',
                    id: comment.id,
                    body: comment.body,
                    author: comment.author.login,
                    path: comment.path,
                  })
                }
              />
            );
          } else {
            const comment = entry.item;
            return (
              <CommentCard
                key={`comment-${comment.id}`}
                comment={comment}
                validationStatus={validations[comment.id]?.status}
                onChat={() =>
                  handleOpenChat({
                    type: 'comment',
                    id: comment.id,
                    body: comment.body,
                    author: comment.author.login,
                  })
                }
              />
            );
          }
        })}
      </div>
    </section>
  );
};

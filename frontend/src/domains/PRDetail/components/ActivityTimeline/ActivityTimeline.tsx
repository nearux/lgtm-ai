import { useState, useEffect } from 'react';
import { useChatPanelSync } from '../../hooks';
import { useChatPanel } from '../../contexts';
import type { PRReview, PRComment } from '@lgtmai/backend/types';
import {
  buildPromptForAction,
  getExecutionMode,
  ACTION_LABELS,
} from '../../utils/reviewPrompts';
import { ReviewCard, type ValidationStatus } from '../ReviewList/components';
import { CommentCard } from './components/CommentCard';

interface Props {
  reviews: PRReview[];
  comments: PRComment[];
  workingDir: string;
  prNumber: number;
}

interface ValidationState {
  status: ValidationStatus;
  result?: string;
}

interface ValidationTarget {
  type: 'review' | 'comment';
  id: string;
  body: string;
  author: string;
  path?: string;
}

type ActivityItem =
  | { kind: 'review'; date: string; item: PRReview }
  | { kind: 'comment'; date: string; item: PRComment };

export const ActivityTimeline = ({
  reviews,
  comments,
  workingDir,
  prNumber,
}: Props) => {
  const [validations, setValidations] = useState<
    Record<string, ValidationState>
  >({});
  const [activeTarget, setActiveTarget] = useState<ValidationTarget | null>(
    null
  );

  const { openPanel, setMode, setTargetContext, setOnExecuteAction } =
    useChatPanel();
  const {
    status: wsStatus,
    messages,
    connect,
    execute,
    clearMessages,
    addUserMessage,
  } = useChatPanelSync(workingDir);

  const handleOpenChat = (target: ValidationTarget) => {
    if (wsStatus !== 'connected') {
      connect();
    }
    setActiveTarget(target);
    clearMessages();

    setTargetContext({
      type: target.type === 'review' ? 'review' : 'inline',
      author: target.author,
      body: target.body,
      path: target.path,
      prNumber,
    });

    setOnExecuteAction((actionId: string, customPrompt?: string) => {
      setValidations((prev) => ({
        ...prev,
        [target.id]: { status: 'validating' },
      }));

      const prompt =
        customPrompt || buildPromptForAction(actionId, target, prNumber);
      const executionMode = getExecutionMode(actionId);

      const userMessage = ACTION_LABELS[actionId] || customPrompt || actionId;
      addUserMessage(userMessage);

      setMode('chat');
      execute(prompt, workingDir, { executionMode });
    });

    setMode('action-selection');
    openPanel(
      target.type === 'review'
        ? `Chat: ${target.author}'s review`
        : `Chat: ${target.author}'s comment`
    );
  };

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

  const timeline: ActivityItem[] = [
    ...reviews.map(
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
            return (
              <ReviewCard
                key={`review-${review.id}`}
                review={review}
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

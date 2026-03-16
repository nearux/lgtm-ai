import { useState, useEffect } from 'react';
import { useChatPanelSync } from '../../hooks';
import { useChatPanel } from '../../contexts';
import type { PRReview } from '@lgtmai/backend/types';
import {
  buildPromptForAction,
  getExecutionMode,
  ACTION_LABELS,
} from '../../utils/reviewPrompts';
import { ReviewCard, type ValidationStatus } from './components';

interface Props {
  reviews: PRReview[];
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

export const ReviewList = ({ reviews, workingDir, prNumber }: Props) => {
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
        : `Chat: ${target.author}'s comment on ${target.path}`
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

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Reviews ({reviews.length})
      </h2>

      {reviews.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
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
          ))}
        </div>
      )}
    </section>
  );
};

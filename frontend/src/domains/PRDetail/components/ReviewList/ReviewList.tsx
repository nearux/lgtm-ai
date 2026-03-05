import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/shared/utils';
import { Button } from '@/shared/components';
import { useClaudeWebSocket } from '../../hooks';
import { useChatPanel } from '../../contexts';
import type { PRReview } from '@lgtmai/backend/types';
import { DiffHunk } from './components/DiffHunk/DiffHunk';

interface Props {
  reviews: PRReview[];
  workingDir: string;
  prNumber: number;
}

const reviewStateStyles = {
  APPROVED: {
    bg: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-800',
  },
  CHANGES_REQUESTED: {
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-800',
  },
  COMMENTED: {
    bg: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
  },
  PENDING: {
    bg: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  DISMISSED: {
    bg: 'bg-gray-50 border-gray-200',
    badge: 'bg-gray-100 text-gray-800',
  },
};

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface ReviewValidation {
  status: ValidationStatus;
  result?: string;
}

export const ReviewList = ({ reviews, workingDir, prNumber }: Props) => {
  const [validations, setValidations] = useState<
    Record<string, ReviewValidation>
  >({});
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const { openPanel, setMessages, setStatus } = useChatPanel();
  const {
    status: wsStatus,
    messages,
    connect,
    execute,
    clearMessages,
  } = useClaudeWebSocket();

  // Sync messages and status to context
  useEffect(() => {
    setMessages(messages);
  }, [messages, setMessages]);

  useEffect(() => {
    setStatus(wsStatus);
  }, [wsStatus, setStatus]);

  const handleValidate = (review: PRReview) => {
    if (wsStatus !== 'connected') {
      connect();
    }
    setActiveReviewId(review.id);
    setValidations((prev) => ({
      ...prev,
      [review.id]: { status: 'validating' },
    }));
    clearMessages();
    openPanel(`Validating: ${review.author.login}'s review`);
  };

  useEffect(() => {
    if (wsStatus === 'connected' && activeReviewId) {
      const review = reviews.find((r) => r.id === activeReviewId);
      if (review && validations[activeReviewId]?.status === 'validating') {
        const prompt = `Review this PR review comment and determine if it's a valid, actionable code review suggestion.

PR Number: #${prNumber}
Review Author: ${review.author.login}
Review State: ${review.state}
Review Body:
${review.body}

Analyze if this review comment:
1. Points out a real issue or valid improvement
2. Is actionable (can be addressed with code changes)
3. Is clear and specific enough to act upon

Respond with:
- "VALID" if the review is legitimate and actionable
- "INVALID" if the review is vague, incorrect, or not actionable

Then briefly explain your reasoning in 1-2 sentences.`;

        execute(prompt, workingDir, { executionMode: 'bypassPermissions' });
      }
    }
  }, [
    wsStatus,
    activeReviewId,
    reviews,
    validations,
    prNumber,
    workingDir,
    execute,
  ]);

  useEffect(() => {
    if (!activeReviewId) return;

    const isDone = messages.some((m) => m.type === 'done');
    if (isDone) {
      const textMessages = messages.filter((m) => m.type === 'text');
      const fullText = textMessages.map((m) => m.content).join('');
      const isValid =
        fullText.toUpperCase().includes('VALID') &&
        !fullText.toUpperCase().startsWith('INVALID');
      setValidations((prev) => ({
        ...prev,
        [activeReviewId]: {
          status: isValid ? 'valid' : 'invalid',
          result: fullText.trim(),
        },
      }));
      setActiveReviewId(null);
    }
  }, [messages, activeReviewId]);

  const getValidationIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

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
          {reviews.map((review) => {
            const validation = validations[review.id];
            return (
              <div
                key={review.id}
                className={`rounded-xl border p-4 ${reviewStateStyles[review.state as keyof typeof reviewStateStyles]?.bg || 'border-gray-200 bg-gray-50'}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${reviewStateStyles[review.state as keyof typeof reviewStateStyles]?.badge || 'bg-gray-100 text-gray-800'}`}
                    >
                      {review.state}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {review.author.login}
                    </span>
                    {validation && getValidationIcon(validation.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {formatDateTime(review.submittedAt)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleValidate(review)}
                      disabled={validation?.status === 'validating'}
                    >
                      {validation?.status === 'validating'
                        ? 'Validating...'
                        : 'Validate'}
                    </Button>
                  </div>
                </div>
                {review.body && (
                  <div className="prose prose-gray max-w-none">
                    <Markdown>{review.body}</Markdown>
                  </div>
                )}
                {review.inlineComments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {review.inlineComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-lg border border-gray-200 bg-white text-sm"
                      >
                        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-700">
                            {comment.path}
                          </code>
                          <span className="text-xs text-gray-500">
                            {comment.author.login}
                          </span>
                        </div>
                        {comment.diffHunk && (
                          <DiffHunk
                            diffHunk={comment.diffHunk}
                            filePath={comment.path}
                          />
                        )}
                        <div className="prose prose-gray max-w-none px-3 py-2 text-sm">
                          <Markdown>{comment.body}</Markdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {validation?.result && (
                  <div
                    className={`mt-3 rounded-lg p-3 text-sm ${
                      validation.status === 'valid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <strong>AI Analysis:</strong>
                    <p className="mt-1 whitespace-pre-wrap">
                      {validation.result}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

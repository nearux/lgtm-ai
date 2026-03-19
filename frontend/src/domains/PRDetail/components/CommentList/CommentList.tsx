import { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/shared/utils';
import { Button, GFMMarkdown } from '@/shared/components';
import { useClaudeWebSocket } from '../../hooks';
import { useChatPanel } from '../../contexts';
import type { PRComment } from '@lgtmai/backend/types';

interface Props {
  comments: PRComment[];
  workingDir: string;
  prNumber: number;
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface ValidationState {
  status: ValidationStatus;
  result?: string;
}

interface ValidationTarget {
  id: string;
  body: string;
  author: string;
}

export const CommentList = ({ comments, workingDir, prNumber }: Props) => {
  const [validations, setValidations] = useState<
    Record<string, ValidationState>
  >({});
  const [activeTarget, setActiveTarget] = useState<ValidationTarget | null>(
    null
  );
  const pendingPromptRef = useRef<string | null>(null);

  const { openPanel, setMessages, setStatus } = useChatPanel();
  const {
    status: wsStatus,
    messages,
    connect,
    execute,
    clearMessages,
  } = useClaudeWebSocket();

  useEffect(() => {
    setMessages(messages);
  }, [messages, setMessages]);

  useEffect(() => {
    setStatus(wsStatus);
  }, [wsStatus, setStatus]);

  const buildPrompt = (target: ValidationTarget) => {
    return `Review this PR comment and determine if it's a valid, actionable suggestion.

PR Number: #${prNumber}
Comment Author: ${target.author}
Comment:
${target.body}

Analyze if this comment:
1. Points out a real issue or valid improvement
2. Is actionable (can be addressed with code changes)
3. Is clear and specific enough to act upon

Respond with:
- "VALID" if the comment is legitimate and actionable
- "INVALID" if the comment is vague, incorrect, or not actionable

Then briefly explain your reasoning in 1-2 sentences.`;
  };

  const handleValidate = (target: ValidationTarget) => {
    if (wsStatus !== 'connected') {
      connect();
    }
    setActiveTarget(target);
    setValidations((prev) => ({
      ...prev,
      [target.id]: { status: 'validating' },
    }));
    clearMessages();
    pendingPromptRef.current = buildPrompt(target);
    openPanel(`Validating: ${target.author}'s comment`);
  };

  useEffect(() => {
    if (wsStatus === 'connected' && activeTarget && pendingPromptRef.current) {
      const prompt = pendingPromptRef.current;
      pendingPromptRef.current = null;
      execute(prompt, workingDir, { executionMode: 'bypassPermissions' });
    }
  }, [wsStatus, activeTarget, workingDir, execute]);

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
        Comments ({comments.length})
      </h2>

      {comments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No comments yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const validation = validations[comment.id];
            return (
              <div
                key={comment.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={comment.author.avatarUrl}
                      alt={comment.author.login}
                      className="h-6 w-6 rounded-full"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {comment.author.login}
                    </span>
                    {validation && getValidationIcon(validation.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {formatDateTime(comment.createdAt)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleValidate({
                          id: comment.id,
                          body: comment.body,
                          author: comment.author.login,
                        })
                      }
                      disabled={validation?.status === 'validating'}
                    >
                      {validation?.status === 'validating'
                        ? 'Validating...'
                        : 'Validate'}
                    </Button>
                  </div>
                </div>
                <GFMMarkdown>{comment.body}</GFMMarkdown>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useChatPanelSync, useChatPanelParams } from '../../hooks';
import { useChatPanel } from '../../contexts';
import type {
  PRReview,
  ChatSessionSummary,
  ClaudeChatContext,
  PRMeta,
} from '@lgtmai/backend/types';
import { ACTION_LABELS } from '../../utils/reviewPrompts';
import { ReviewCard, type ValidationStatus } from './components';
import { prsMutation, chatSessionsQuery } from '@/shared/apis';
import { useOverlay } from '@/shared/hooks';
import { CheckoutModal } from './components/CheckoutModal/CheckoutModal';
import type { ClaudeMessage } from '../../hooks';

interface Props {
  reviews: PRReview[];
  workingDir: string;
  projectId: string;
  prNumber: number;
  prState: string;
  prMeta: PRMeta;
  origin?: string;
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
  diffHunk?: string;
}

export const ReviewList = ({
  reviews,
  workingDir,
  projectId,
  prNumber,
  prState,
  prMeta,
  origin,
}: Props) => {
  const [validations, setValidations] = useState<
    Record<string, ValidationState>
  >({});
  const [activeTarget, setActiveTarget] = useState<ValidationTarget | null>(
    null
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const overlay = useOverlay();

  const { mutateAsync: checkoutPR } = useMutation(prsMutation.checkout());

  const {
    setTitle,
    setTargetContext,
    setPRContext,
    setOnExecuteAction,
    setOnResumeSession,
    setClaudeSessionId,
  } = useChatPanel();

  const {
    openActionSelector,
    openChat,
    resumeSession: resumeSessionUrl,
  } = useChatPanelParams();

  const {
    status: wsStatus,
    messages,
    sessionId,
    connect,
    execute,
    clearMessages,
    addUserMessage,
    loadHistoryMessages,
  } = useChatPanelSync(workingDir);

  // Fetch history for selected session
  const { data: historyData } = useQuery({
    ...chatSessionsQuery.history(projectId, prNumber, selectedSessionId ?? ''),
    enabled: !!selectedSessionId,
  });

  // When history data is loaded, convert to messages and display
  useEffect(() => {
    if (historyData && selectedSessionId) {
      const convertedMessages: ClaudeMessage[] = historyData.entries.map(
        (entry, index) => ({
          id: `history-${index}`,
          type: entry.role === 'user' ? 'user' : 'text',
          content: entry.content,
          timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
        })
      );

      loadHistoryMessages(convertedMessages);
      setClaudeSessionId(historyData.claudeSessionId);
      setSelectedSessionId(null);
    }
  }, [historyData, selectedSessionId, loadHistoryMessages, setClaudeSessionId]);

  const executeAction = (
    actionId: string,
    customPrompt: string | undefined,
    target: ValidationTarget
  ) => {
    setValidations((prev) => ({
      ...prev,
      [target.id]: { status: 'validating' },
    }));

    const userMessage = ACTION_LABELS[actionId] || customPrompt || actionId;
    addUserMessage(userMessage);

    const chatContext: ClaudeChatContext = {
      projectId,
      prNumber,
      scopeType: target.type === 'review' ? 'REVIEW' : 'COMMENT',
      scopeTargetId: target.id,
      title: userMessage,
    };

    openChat();
    execute(
      {
        type: 'command',
        command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
        context:
          target.type === 'comment'
            ? {
                type: 'comment' as const,
                author: target.author,
                body: target.body,
                path: target.path ?? '',
                diffHunk: target.diffHunk,
                prMeta,
              }
            : {
                type: 'review' as const,
                author: target.author,
                body: target.body,
                prMeta,
              },
        ...(customPrompt ? { customPrompt } : {}),
      },
      workingDir,
      { executionMode: 'bypassPermissions' },
      chatContext
    );
  };

  const handleActionWithCheckout = (
    actionId: string,
    customPrompt: string | undefined,
    target: ValidationTarget
  ) => {
    // Skip checkout for closed/merged PRs
    if (prState !== 'OPEN') {
      executeAction(actionId, customPrompt, target);
      return;
    }

    overlay.open(
      ({ isOpen, close }) => (
        <CheckoutModal
          isOpen={isOpen}
          close={close}
          onConfirm={async () => {
            await checkoutPR({
              projectId,
              prNumber,
              body: { force: true, origin },
            });
            close();
            executeAction(actionId, customPrompt, target);
          }}
        />
      ),
      'checkout-modal'
    );
  };

  const handleResumeSession = (session: ChatSessionSummary) => {
    if (wsStatus !== 'connected') {
      connect();
    }
    setSelectedSessionId(session.id);
    setTitle(session.title || `Chat ${session.id.slice(0, 8)}`);
    resumeSessionUrl(
      session.scopeType === 'REVIEW' ? 'review' : 'comment',
      session.scopeTargetId
    );
  };

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

    setPRContext({ projectId, prNumber });
    setOnResumeSession(handleResumeSession);

    setOnExecuteAction((actionId: string, customPrompt?: string) => {
      handleActionWithCheckout(actionId, customPrompt, target);
    });

    setTitle(
      target.type === 'review'
        ? `Chat: ${target.author}'s review`
        : `Chat: ${target.author}'s comment on ${target.path}`
    );

    openActionSelector(target.type, target.id);
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

  // Sync sessionId to claudeSessionId when a new session completes
  useEffect(() => {
    if (sessionId) {
      setClaudeSessionId(sessionId);
    }
  }, [sessionId, setClaudeSessionId]);

  return (
    <>
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
                    diffHunk: comment.diffHunk,
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
};

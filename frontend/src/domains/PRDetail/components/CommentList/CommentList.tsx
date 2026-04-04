import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { MessageCircle } from 'lucide-react';
import { formatDateTime } from '@/shared/utils';
import { Button, GFMMarkdown } from '@/shared/components';
import { chatSessionsQuery, prsMutation } from '@/shared/apis';
import { useChatPanelSync, useChatPanelParams } from '../../hooks';
import { useChatPanel } from '../../contexts';
import { useOverlay } from '@/shared/hooks';
import type { ClaudeMessage } from '../../hooks';
import { ACTION_LABELS } from '../../utils/reviewPrompts';
import { CheckoutModal } from '../ReviewList/components/CheckoutModal/CheckoutModal';
import type {
  PRComment,
  PRMeta,
  ClaudeChatContext,
  ChatSessionSummary,
} from '@lgtmai/backend/types';

interface Props {
  comments: PRComment[];
  workingDir: string;
  projectId: string;
  prNumber: number;
  prState: string;
  origin?: string;
  prMeta: PRMeta;
}

interface ValidationTarget {
  type: 'comment';
  id: string;
  body: string;
  author: string;
}

export const CommentList = ({
  comments,
  workingDir,
  projectId,
  prNumber,
  prState,
  origin,
  prMeta,
}: Props) => {
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

  const handleResumeSession = (session: ChatSessionSummary) => {
    if (wsStatus !== 'connected') {
      connect();
    }
    setSelectedSessionId(session.id);
    setTitle(session.title || `Chat ${session.id.slice(0, 8)}`);
    resumeSessionUrl('comment', session.scopeTargetId);
  };

  const executeAction = (
    actionId: string,
    customPrompt: string | undefined,
    target: ValidationTarget
  ) => {
    const userMessage = ACTION_LABELS[actionId] || customPrompt || actionId;
    addUserMessage(userMessage);

    const chatContext: ClaudeChatContext = {
      projectId,
      prNumber,
      scopeType: 'COMMENT',
      scopeTargetId: target.id,
      title: userMessage,
    };

    openChat();
    execute(
      {
        type: 'command',
        command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
        context: {
          type: 'comment',
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

  const handleFixAction = (
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

  const handleOpenChat = (target: ValidationTarget) => {
    if (wsStatus !== 'connected') {
      connect();
    }
    setActiveTarget(target);
    clearMessages();

    setTargetContext({
      type: 'inline',
      author: target.author,
      body: target.body,
      prNumber,
    });

    setPRContext({ projectId, prNumber });
    setOnResumeSession(handleResumeSession);

    setOnExecuteAction((actionId: string, customPrompt?: string) => {
      if (actionId === 'fix') {
        handleFixAction(actionId, customPrompt, target);
      } else {
        executeAction(actionId, customPrompt, target);
      }
    });

    setTitle(`Chat: ${target.author}'s comment`);
    openActionSelector('comment', target.id);
  };

  useEffect(() => {
    if (!activeTarget) return;

    const isDone = messages.some((m) => m.type === 'done');
    if (isDone) {
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
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {formatDateTime(comment.createdAt)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        handleOpenChat({
                          type: 'comment',
                          id: comment.id,
                          body: comment.body,
                          author: comment.author.login,
                        })
                      }
                    >
                      <MessageCircle className="mr-1 h-3.5 w-3.5" />
                      Chat
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

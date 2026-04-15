import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatSessionsQuery } from '@/shared/apis';
import type {
  PRMeta,
  ClaudeChatContext,
  ChatSessionSummary,
} from '@lgtmai/backend/types';
import { useChatPanel } from '../contexts';
import { useChatPanelParams } from './useChatPanelParams';
import type { ClaudeMessage } from './useClaudeWebSocket';
import { ACTION_LABELS } from '../utils/reviewPrompts';

interface UsePRChatOptions {
  projectId: string;
  prNumber: number;
  prMeta: PRMeta;
  prAuthor: string;
  prBody: string;
  workingDir: string;
}

export function usePRChat({
  projectId,
  prNumber,
  prMeta,
  prAuthor,
  prBody,
  workingDir,
}: UsePRChatOptions) {
  const {
    state,
    setTitle,
    setTargetContext,
    setPRContext,
    setOnExecuteAction,
    setOnResumeSession,
    setClaudeSessionId,
    setWorkingDir,
    connect,
    execute,
    clearMessages,
    addUserMessage,
    loadHistoryMessages,
  } = useChatPanel();
  const { openActionSelector, openChat, resumeSession } = useChatPanelParams();

  // Set workingDir for follow-up handler
  useEffect(() => {
    setWorkingDir(workingDir);
  }, [workingDir, setWorkingDir]);

  // --- Session resume ---
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const { data: historyData } = useQuery({
    ...chatSessionsQuery.history(projectId, prNumber, selectedSessionId ?? ''),
    enabled: !!selectedSessionId,
  });

  useEffect(() => {
    if (!historyData || !selectedSessionId) return;
    const msgs: ClaudeMessage[] = historyData.entries.map((e, i) => ({
      id: `history-${i}`,
      type: e.messageType,
      content: e.content,
      toolName: e.toolName,
      toolId: e.toolId,
      isError: e.isError,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));
    loadHistoryMessages(msgs);
    setClaudeSessionId(historyData.claudeSessionId);
    setSelectedSessionId(null);
  }, [historyData, selectedSessionId, loadHistoryMessages, setClaudeSessionId]);

  // --- Public API ---
  const openPRChat = () => {
    if (state.status !== 'connected') connect();
    clearMessages();

    setTargetContext({ type: 'pr', author: prAuthor, body: prBody, prNumber });
    setPRContext({ projectId, prNumber });

    setOnResumeSession((session: ChatSessionSummary) => {
      if (state.status !== 'connected') connect();
      setSelectedSessionId(session.id);
      setTitle(session.title || `Chat ${session.id.slice(0, 8)}`);
      const isPR = session.scopeType === 'REVIEW' && !session.scopeTargetId;
      resumeSession(
        isPR ? 'pr' : session.scopeType === 'REVIEW' ? 'review' : 'comment',
        session.scopeTargetId
      );
    });

    setOnExecuteAction((actionId: string, customPrompt?: string) => {
      const label = ACTION_LABELS[actionId] || customPrompt || actionId;
      addUserMessage(label);

      const chatContext: ClaudeChatContext = {
        projectId,
        prNumber,
        scopeType: 'REVIEW',
        scopeTargetId: '',
        title: label,
      };

      openChat();
      execute(
        {
          type: 'command',
          command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
          context: { type: 'review', author: prAuthor, body: prBody, prMeta },
          ...(customPrompt ? { customPrompt } : {}),
        },
        workingDir,
        { executionMode: 'bypassPermissions' },
        chatContext
      );
    });

    openActionSelector('pr', `pr-${prNumber}`);
  };

  return { openPRChat };
}

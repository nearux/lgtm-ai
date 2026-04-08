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
import { useChatPanelSync } from './useChatPanelSync';
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
    setTitle,
    setTargetContext,
    setPRContext,
    setOnExecuteAction,
    setOnResumeSession,
    setClaudeSessionId,
  } = useChatPanel();
  const { openActionSelector, openChat, resumeSession } = useChatPanelParams();
  const ws = useChatPanelSync(workingDir);

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
      type: e.role === 'user' ? ('user' as const) : ('text' as const),
      content: e.content,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));
    ws.loadHistoryMessages(msgs);
    setClaudeSessionId(historyData.claudeSessionId);
    setSelectedSessionId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    historyData,
    selectedSessionId,
    ws.loadHistoryMessages,
    setClaudeSessionId,
  ]);

  // --- Public API ---
  const openPRChat = () => {
    if (ws.status !== 'connected') ws.connect();
    ws.clearMessages();

    setTargetContext({ type: 'pr', author: prAuthor, body: prBody, prNumber });
    setPRContext({ projectId, prNumber });

    setOnResumeSession((session: ChatSessionSummary) => {
      if (ws.status !== 'connected') ws.connect();
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
      ws.addUserMessage(label);

      const chatContext: ClaudeChatContext = {
        projectId,
        prNumber,
        scopeType: 'REVIEW',
        scopeTargetId: '',
        title: label,
      };

      openChat();
      ws.execute(
        {
          type: 'command',
          command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
          // Backend treats type:'review' without path/diffHunk as PR-level scope
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

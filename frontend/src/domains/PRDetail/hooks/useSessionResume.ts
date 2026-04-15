import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getChatSessionHistoryQueryOptions } from '@/queries';
import type { ChatSessionSummary } from '@lgtmai/backend/types';
import { useChatPanel } from '../contexts';
import { useChatPanelParams } from './useChatPanelParams';
import type {
  ClaudeMessage,
  UseClaudeWebSocketReturn,
} from './useClaudeWebSocket';

interface UseSessionResumeOptions {
  projectId: string;
  prNumber: number;
  workingDir: string;
  ws: UseClaudeWebSocketReturn;
}

export function useSessionResume({
  projectId,
  prNumber,
  workingDir,
  ws,
}: UseSessionResumeOptions) {
  const {
    setTitle,
    setClaudeSessionId,
    setOnResumeSession,
    setOnSendFollowUp,
    state,
  } = useChatPanel();
  const { resumeSession } = useChatPanelParams();

  // --- Session resume ---
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const { data: historyData } = useQuery({
    ...getChatSessionHistoryQueryOptions(
      projectId,
      prNumber,
      selectedSessionId ?? ''
    ),
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

  // Set up follow-up handler
  useEffect(() => {
    const handleFollowUp = (message: string) => {
      const sessionIdToUse = state.claudeSessionId || ws.sessionId;
      if (sessionIdToUse) {
        ws.execute({ type: 'followUp', message }, workingDir, {
          executionMode: 'bypassPermissions',
          sessionId: sessionIdToUse,
        });
      }
    };
    setOnSendFollowUp(handleFollowUp);
    return () => setOnSendFollowUp(null);
  }, [
    state.claudeSessionId,
    ws.sessionId,
    ws.execute,
    workingDir,
    setOnSendFollowUp,
  ]);

  const registerResumeSession = () => {
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
  };

  return { registerResumeSession };
}

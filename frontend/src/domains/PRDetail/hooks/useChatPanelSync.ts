import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatPanel } from '../contexts';
import { useClaudeWebSocket } from './useClaudeWebSocket';
import { chatSessionsQueryKey } from '@/shared/apis';

/**
 * Syncs WebSocket state to ChatPanel context
 * Returns the WebSocket hook values for direct use
 */
export function useChatPanelSync(workingDir: string) {
  const {
    state,
    setMessages,
    setStatus,
    setSessionId,
    setOnSendFollowUp,
    setClaudeSessionId,
    setClearMessages,
  } = useChatPanel();

  const ws = useClaudeWebSocket();
  const queryClient = useQueryClient();
  const prevMessageCountRef = useRef(0);

  // Invalidate chat sessions query when a chat completes (done message received)
  useEffect(() => {
    const hasDone = ws.messages.some((m) => m.type === 'done');
    const prevHadDone = prevMessageCountRef.current > 0;

    // Only invalidate when we first see a 'done' message (not on subsequent renders)
    if (hasDone && !prevHadDone && state.prContext) {
      queryClient.invalidateQueries({
        queryKey: chatSessionsQueryKey.list(
          state.prContext.projectId,
          state.prContext.prNumber
        ),
      });
    }

    prevMessageCountRef.current = ws.messages.filter(
      (m) => m.type === 'done'
    ).length;
  }, [ws.messages, state.prContext, queryClient]);

  // Expose clearMessages to context so page.tsx can call it
  const clearAll = useCallback(() => {
    ws.clearMessages();
  }, [ws]);

  useEffect(() => {
    setClearMessages(clearAll);
    return () => setClearMessages(null);
  }, [clearAll, setClearMessages]);

  // Sync messages
  useEffect(() => {
    setMessages(ws.messages);
  }, [ws.messages, setMessages]);

  // Sync status
  useEffect(() => {
    setStatus(ws.status);
  }, [ws.status, setStatus]);

  // Sync sessionId
  useEffect(() => {
    setSessionId(ws.sessionId);
  }, [ws.sessionId, setSessionId]);

  // Update claudeSessionId when ws.sessionId changes (new session created)
  useEffect(() => {
    if (ws.sessionId) {
      setClaudeSessionId(ws.sessionId);
    }
  }, [ws.sessionId, setClaudeSessionId]);

  // Set up follow-up handler - use context's claudeSessionId (supports resumed sessions)
  useEffect(() => {
    const handleFollowUp = (message: string) => {
      // Prefer claudeSessionId from context (for resumed sessions)
      // Fall back to ws.sessionId (for current session)
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
    workingDir,
    ws.execute,
    setOnSendFollowUp,
  ]);

  return ws;
}

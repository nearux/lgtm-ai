import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatPanel } from '../contexts';
import { getChatSessionListQueryOptions } from '@/shared/queries';
import type { UseClaudeWebSocketReturn } from './useClaudeWebSocket';

/**
 * Bridges WebSocket events to query cache and context.
 * Takes a ws instance (created at page level) rather than creating its own.
 */
export function useChatPanelSync(ws: UseClaudeWebSocketReturn) {
  const { state, setClaudeSessionId } = useChatPanel();
  const queryClient = useQueryClient();
  const prevDoneCountRef = useRef(0);

  // Invalidate chat sessions query when a chat completes
  useEffect(() => {
    const doneCount = ws.messages.filter((m) => m.type === 'done').length;

    if (doneCount > prevDoneCountRef.current && state.prContext) {
      queryClient.invalidateQueries({
        queryKey: getChatSessionListQueryOptions(
          state.prContext.projectId,
          state.prContext.prNumber
        ).queryKey,
      });
    }

    prevDoneCountRef.current = doneCount;
  }, [ws.messages, state.prContext, queryClient]);

  // Sync sessionId to context for session resumption
  useEffect(() => {
    if (ws.sessionId) {
      setClaudeSessionId(ws.sessionId);
    }
  }, [ws.sessionId, setClaudeSessionId]);
}

import { useEffect } from 'react';
import { useChatPanel } from '../contexts';
import { useClaudeWebSocket } from './useClaudeWebSocket';

/**
 * Syncs WebSocket state to ChatPanel context
 * Returns the WebSocket hook values for direct use
 */
export function useChatPanelSync(workingDir: string) {
  const { setMessages, setStatus, setSessionId, setOnSendFollowUp } =
    useChatPanel();

  const ws = useClaudeWebSocket();

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

  // Set up follow-up handler
  useEffect(() => {
    const handleFollowUp = (message: string) => {
      if (ws.sessionId) {
        ws.execute({ followUp: message }, workingDir, {
          executionMode: 'bypassPermissions',
          sessionId: ws.sessionId,
        });
      }
    };
    setOnSendFollowUp(handleFollowUp);
    return () => setOnSendFollowUp(null);
  }, [ws.sessionId, workingDir, ws.execute, setOnSendFollowUp]);

  return ws;
}

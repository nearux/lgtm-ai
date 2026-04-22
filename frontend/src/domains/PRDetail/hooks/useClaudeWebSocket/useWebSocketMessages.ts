import { useState, useCallback } from 'react';
import type { ClaudeMessage, FileChangesData } from './types';

export function useWebSocketMessages() {
  const [messages, setMessages] = useState<ClaudeMessage[]>([]);
  const [fileChanges, setFileChanges] = useState<FileChangesData | null>(null);

  const addMessage = useCallback(
    (msg: Omit<ClaudeMessage, 'id' | 'timestamp'>) => {
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ]);
    },
    []
  );

  const appendStderrChunk = useCallback((chunk: string) => {
    setMessages((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        const msg = prev[i];
        if (msg.type === 'tool') {
          const hasResult = prev.some(
            (m) => m.type === 'tool_result' && m.toolId === msg.toolId
          );
          if (!hasResult) {
            const next = [...prev];
            next[i] = {
              ...msg,
              stderrChunks: [...(msg.stderrChunks ?? []), chunk],
            };
            return next;
          }
        }
      }
      return prev;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setFileChanges(null);
  }, []);

  const addUserMessage = useCallback(
    (content: string) => {
      addMessage({ type: 'user', content });
    },
    [addMessage]
  );

  const loadHistoryMessages = useCallback((msgs: ClaudeMessage[]) => {
    setMessages(msgs);
  }, []);

  return {
    messages,
    fileChanges,
    setFileChanges,
    addMessage,
    appendStderrChunk,
    clearMessages,
    addUserMessage,
    loadHistoryMessages,
  };
}

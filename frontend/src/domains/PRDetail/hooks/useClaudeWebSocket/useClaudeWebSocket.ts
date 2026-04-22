import { useEffect, useCallback, useState, useRef } from 'react';
import type {
  WsServerMessage,
  ClaudeExecuteOptions,
  CommandPayload,
  FollowUpPayload,
  ConnectionStatus,
  ClaudeMessage,
  ApprovalRequest,
  FileChangesData,
} from './types';
import type { ClaudeChatContext } from '@lgtmai/backend/types';
import { useWebSocketConnection } from './useWebSocketConnection';
import { useWebSocketMessages } from './useWebSocketMessages';
import { useWebSocketApprovals } from './useWebSocketApprovals';

export interface UseClaudeWebSocketReturn {
  status: ConnectionStatus;
  isStreaming: boolean;
  messages: ClaudeMessage[];
  fileChanges: FileChangesData | null;
  pendingApproval: ApprovalRequest | null;
  sessionId: string | null;
  connect: () => void;
  disconnect: () => void;
  execute: (
    payload: CommandPayload | FollowUpPayload,
    workingDir: string,
    options?: ClaudeExecuteOptions,
    chatContext?: ClaudeChatContext
  ) => string;
  abort: (requestId: string) => void;
  stop: () => void;
  respondToApproval: (
    requestId: string,
    approvalRequestId: string,
    behavior: 'allow' | 'deny',
    message?: string
  ) => void;
  respondToPlanApproval: (
    requestId: string,
    approvalRequestId: string,
    behavior: 'allow' | 'deny',
    message?: string
  ) => void;
  clearMessages: () => void;
  addUserMessage: (content: string) => void;
  loadHistoryMessages: (msgs: ClaudeMessage[]) => void;
}

export function useClaudeWebSocket(): UseClaudeWebSocketReturn {
  const { status, connect, disconnect, send, setOnMessage } =
    useWebSocketConnection();
  const {
    messages,
    fileChanges,
    setFileChanges,
    addMessage,
    appendStderrChunk,
    clearMessages,
    addUserMessage,
    loadHistoryMessages,
  } = useWebSocketMessages();
  const {
    pendingApproval,
    setApproval,
    respondToApproval,
    respondToPlanApproval,
  } = useWebSocketApprovals(send);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const abortPendingRef = useRef(false);
  const activeRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeRequestIdRef.current = activeRequestId;
  }, [activeRequestId]);

  // Wire up message handler
  useEffect(() => {
    setOnMessage((event: MessageEvent) => {
      const data = JSON.parse(event.data) as WsServerMessage;

      switch (data.type) {
        case 'text':
          addMessage({ type: 'text', content: data.chunk });
          break;
        case 'tool_message':
          addMessage({
            type: 'tool',
            content: JSON.stringify(data.input, null, 2),
            toolName: data.toolName,
            toolId: data.toolId,
          });
          break;
        case 'tool_result':
          addMessage({
            type: 'tool_result',
            content: data.content,
            toolId: data.toolId,
            isError: data.isError,
          });
          break;
        case 'stderr':
          appendStderrChunk(data.chunk);
          break;
        case 'error':
          abortPendingRef.current = false;
          setActiveRequestId(null);
          addMessage({ type: 'error', content: data.message });
          break;
        case 'done':
          if (data.sessionId) {
            setSessionId(data.sessionId);
          }
          setActiveRequestId(null);
          if (abortPendingRef.current) {
            abortPendingRef.current = false;
            addMessage({ type: 'aborted', content: '' });
          } else {
            addMessage({ type: 'done', content: '' });
          }
          break;
        case 'approval_request':
          setApproval({
            requestId: data.requestId,
            approvalRequestId: data.approvalRequestId,
            toolUseId: data.toolUseId,
            toolName: data.toolName,
            input: data.input,
            type: 'tool',
          });
          break;
        case 'plan_approval_request':
          setApproval({
            requestId: data.requestId,
            approvalRequestId: data.approvalRequestId,
            toolUseId: data.toolUseId,
            toolName: data.toolName,
            input: data.input,
            type: 'plan',
          });
          break;
        case 'file_changes':
          setFileChanges(data.changes);
          break;
      }
    });
  }, [
    addMessage,
    appendStderrChunk,
    setApproval,
    setFileChanges,
    setOnMessage,
  ]);

  const execute = useCallback(
    (
      payload: CommandPayload | FollowUpPayload,
      workingDir: string,
      options?: ClaudeExecuteOptions,
      chatContext?: ClaudeChatContext
    ): string => {
      const requestId = crypto.randomUUID();

      if (payload.type === 'followUp') {
        addMessage({ type: 'user', content: payload.message });
        send({
          type: 'followUp',
          requestId,
          message: payload.message,
          workingDir,
          options,
        });
      } else {
        send({
          type: 'execute',
          requestId,
          command: payload.command,
          context: payload.context,
          ...(payload.customPrompt
            ? { customPrompt: payload.customPrompt }
            : {}),
          workingDir,
          options,
          chatContext,
        });
      }

      setActiveRequestId(requestId);
      return requestId;
    },
    [addMessage, send]
  );

  const abort = useCallback(
    (requestId: string) => {
      send({ type: 'abort', requestId });
    },
    [send]
  );

  const stop = useCallback(() => {
    const requestId = activeRequestIdRef.current;
    if (!requestId) return;
    send({ type: 'abort', requestId });
    abortPendingRef.current = true;
    setActiveRequestId(null);
  }, [send]);

  return {
    status,
    isStreaming: activeRequestId !== null,
    messages,
    fileChanges,
    pendingApproval,
    sessionId,
    connect,
    disconnect,
    execute,
    abort,
    stop,
    respondToApproval,
    respondToPlanApproval,
    clearMessages,
    addUserMessage,
    loadHistoryMessages,
  };
}

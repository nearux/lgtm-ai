import { useEffect, useCallback, useState } from 'react';
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
          addMessage({ type: 'stderr', content: data.chunk });
          break;
        case 'error':
          addMessage({ type: 'error', content: data.message });
          break;
        case 'done':
          if (data.sessionId) {
            setSessionId(data.sessionId);
          }
          addMessage({ type: 'done', content: '' });
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
  }, [addMessage, setApproval, setFileChanges, setOnMessage]);

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

  return {
    status,
    messages,
    fileChanges,
    pendingApproval,
    sessionId,
    connect,
    disconnect,
    execute,
    abort,
    respondToApproval,
    respondToPlanApproval,
    clearMessages,
    addUserMessage,
    loadHistoryMessages,
  };
}

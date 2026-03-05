import { useRef, useState } from 'react';
import type {
  ConnectionStatus,
  ClaudeMessage,
  ApprovalRequest,
  WsServerMessage,
  ClaudeExecuteOptions,
} from './types';

const WS_URL = `ws://${window.location.hostname}:5051/api/claude/execute`;

export interface UseClaudeWebSocketReturn {
  status: ConnectionStatus;
  messages: ClaudeMessage[];
  pendingApproval: ApprovalRequest | null;
  connect: () => void;
  disconnect: () => void;
  execute: (
    prompt: string,
    workingDir: string,
    options?: ClaudeExecuteOptions
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
}

export function useClaudeWebSocket(): UseClaudeWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<ClaudeMessage[]>([]);
  const [pendingApproval, setPendingApproval] =
    useState<ApprovalRequest | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const addMessage = (msg: Omit<ClaudeMessage, 'id' | 'timestamp'>) => {
    setMessages((prev) => [
      ...prev,
      {
        ...msg,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      },
    ]);
  };

  const handleMessage = (event: MessageEvent) => {
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
        addMessage({
          type: 'done',
          content: '',
        });
        break;
      case 'approval_request':
        setPendingApproval({
          requestId: data.requestId,
          approvalRequestId: data.approvalRequestId,
          toolUseId: data.toolUseId,
          toolName: data.toolName,
          input: data.input,
          type: 'tool',
        });
        break;
      case 'plan_approval_request':
        setPendingApproval({
          requestId: data.requestId,
          approvalRequestId: data.approvalRequestId,
          toolUseId: data.toolUseId,
          toolName: data.toolName,
          input: data.input,
          type: 'plan',
        });
        break;
    }
  };

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  };

  const send = (message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  const execute = (
    prompt: string,
    workingDir: string,
    options?: ClaudeExecuteOptions
  ): string => {
    const requestId = crypto.randomUUID();
    send({
      type: 'execute',
      requestId,
      prompt,
      workingDir,
      options,
    });
    return requestId;
  };

  const abort = (requestId: string) => {
    send({ type: 'abort', requestId });
  };

  const respondToApproval = (
    requestId: string,
    approvalRequestId: string,
    behavior: 'allow' | 'deny',
    message?: string
  ) => {
    send({
      type: 'approval_response',
      requestId,
      approvalRequestId,
      behavior,
      message,
    });
    setPendingApproval(null);
  };

  const respondToPlanApproval = (
    requestId: string,
    approvalRequestId: string,
    behavior: 'allow' | 'deny',
    message?: string
  ) => {
    send({
      type: 'plan_approval_response',
      requestId,
      approvalRequestId,
      behavior,
      message,
    });
    setPendingApproval(null);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    status,
    messages,
    pendingApproval,
    connect,
    disconnect,
    execute,
    abort,
    respondToApproval,
    respondToPlanApproval,
    clearMessages,
  };
}

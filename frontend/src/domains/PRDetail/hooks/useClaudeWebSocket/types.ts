export type {
  WsClientMessage,
  WsServerMessage,
  WsExecuteMessage,
  WsAbortMessage,
  WsApprovalResponseMessage,
  WsPlanApprovalResponseMessage,
  WsTextEvent,
  WsToolMessageEvent,
  WsToolResultEvent,
  WsStderrEvent,
  WsDoneEvent,
  WsErrorEvent,
  WsApprovalRequestEvent,
  WsPlanApprovalRequestEvent,
  ClaudeExecuteOptions,
  ClaudeExecutionMode,
} from '@lgtmai/backend/types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface ClaudeMessage {
  id: string;
  type: 'text' | 'tool' | 'tool_result' | 'error' | 'stderr' | 'done';
  content: string;
  toolName?: string;
  toolId?: string;
  isError?: boolean;
  timestamp: Date;
}

export interface ApprovalRequest {
  requestId: string;
  approvalRequestId: string;
  toolUseId: string;
  toolName: string;
  input: unknown;
  type: 'tool' | 'plan';
}

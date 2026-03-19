import type { ClaudeCommand, CommandContext } from '@lgtmai/backend/types';

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
  CommandContext,
  ClaudeCommand,
} from '@lgtmai/backend/types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface ClaudeMessage {
  id: string;
  type: 'text' | 'tool' | 'tool_result' | 'error' | 'stderr' | 'done' | 'user';
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

export interface CommandPayload {
  command: ClaudeCommand;
  context: CommandContext;
  customPrompt?: string;
}

export interface FollowUpPayload {
  followUp: string;
}

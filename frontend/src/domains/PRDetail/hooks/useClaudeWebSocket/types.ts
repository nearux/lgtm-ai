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
  WsFileChangesEvent,
  FileChange,
  FileChangesSummary,
  ClaudeExecuteOptions,
  ClaudeExecutionMode,
  CommandContext,
  ClaudeCommand,
} from '@lgtmai/backend/types';

export interface FileChangesData {
  files: import('@lgtmai/backend/types').FileChange[];
  summary: import('@lgtmai/backend/types').FileChangesSummary;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface ClaudeMessage {
  id: string;
  type:
    | 'text'
    | 'tool'
    | 'tool_result'
    | 'error'
    | 'stderr'
    | 'done'
    | 'user'
    | 'aborted';
  content: string;
  toolName?: string;
  toolId?: string;
  isError?: boolean;
  stderrChunks?: string[];
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
  type: 'command';
  command: ClaudeCommand;
  context: CommandContext;
  customPrompt?: string;
}

export interface FollowUpPayload {
  type: 'followUp';
  message: string;
}

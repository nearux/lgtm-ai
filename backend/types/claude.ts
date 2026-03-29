import type { ClaudeChatContext } from './chatSessions.js';

// ── Client → Server ──────────────────────────────────────────────────

export type ClaudeExecutionMode =
  | 'default'
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'plan';

export interface ClaudeExecuteOptions {
  executionMode?: ClaudeExecutionMode;
  model?: string;
  sessionId?: string;
}

export interface PRMeta {
  number: number;
  title: string;
  body: string;
  baseBranch: string;
  headBranch: string;
  repoOwnerName: string;
}

export interface CommandContext {
  type: 'review' | 'comment';
  author: string;
  body: string;
  path?: string;
  diffHunk?: string;
  prMeta: PRMeta;
}

export type ClaudeCommand = 'validate' | 'fix' | 'explain' | 'custom';

export interface WsCommandExecuteMessage {
  type: 'execute';
  requestId: string;
  workingDir: string;
  command: ClaudeCommand;
  context: CommandContext;
  customPrompt?: string;
  options?: ClaudeExecuteOptions;
  chatContext?: ClaudeChatContext;
}

export interface WsFollowUpExecuteMessage {
  type: 'followUp';
  requestId: string;
  workingDir: string;
  message: string;
  options?: ClaudeExecuteOptions;
  chatContext?: ClaudeChatContext;
}

export type WsExecuteMessage =
  | WsCommandExecuteMessage
  | WsFollowUpExecuteMessage;

export interface WsAbortMessage {
  type: 'abort';
  requestId: string;
}

export interface WsApprovalResponseMessage {
  type: 'approval_response';
  requestId: string;
  approvalRequestId: string;
  behavior: 'allow' | 'deny';
  message?: string;
  updatedInput?: unknown;
}

export interface WsPlanApprovalResponseMessage {
  type: 'plan_approval_response';
  requestId: string;
  approvalRequestId: string;
  behavior: 'allow' | 'deny';
  message?: string;
  updatedInput?: unknown;
}

export type WsClientMessage =
  | WsCommandExecuteMessage
  | WsFollowUpExecuteMessage
  | WsAbortMessage
  | WsApprovalResponseMessage
  | WsPlanApprovalResponseMessage;

// ── Server → Client ──────────────────────────────────────────────────

export interface WsTextEvent {
  type: 'text';
  requestId: string;
  chunk: string;
}

export interface WsToolMessageEvent {
  type: 'tool_message';
  requestId: string;
  toolId: string;
  toolName: string;
  input: unknown;
}

export interface WsToolResultEvent {
  type: 'tool_result';
  requestId: string;
  toolId: string;
  content: string;
  isError: boolean;
}

export interface WsStderrEvent {
  type: 'stderr';
  requestId: string;
  chunk: string;
}

export interface WsDoneEvent {
  type: 'done';
  requestId: string;
  exitCode: number;
  result: string;
  sessionId?: string;
}

export interface WsInitEvent {
  type: 'init';
  requestId: string;
  sessionId: string;
}

export interface WsErrorEvent {
  type: 'error';
  requestId?: string;
  message: string;
}

export interface WsApprovalRequestEvent {
  type: 'approval_request';
  requestId: string;
  approvalRequestId: string;
  toolUseId: string;
  toolName: string;
  input: unknown;
}

export interface WsPlanApprovalRequestEvent {
  type: 'plan_approval_request';
  requestId: string;
  approvalRequestId: string;
  toolUseId: string;
  toolName: string;
  input: unknown;
}

export type WsServerMessage =
  | WsTextEvent
  | WsToolMessageEvent
  | WsToolResultEvent
  | WsStderrEvent
  | WsInitEvent
  | WsDoneEvent
  | WsErrorEvent
  | WsApprovalRequestEvent
  | WsPlanApprovalRequestEvent;

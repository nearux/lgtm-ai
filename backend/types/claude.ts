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

export interface WsExecuteMessage {
  type: 'execute';
  requestId: string;
  prompt: string;
  workingDir: string;
  options?: ClaudeExecuteOptions;
  chatContext?: ClaudeChatContext;
}

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
  | WsExecuteMessage
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

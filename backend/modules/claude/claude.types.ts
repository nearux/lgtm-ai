import type { ClaudeChatContext } from '../projects/chat-session.types.js';
import type {
  FileChange,
  FileChangesSummary,
} from '../projects/git-file-change.types.js';

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

interface WithPRMeta {
  prMeta: PRMeta;
}

export interface PRReviewCommandContext extends WithPRMeta {
  type: 'review';
  author: string;
  body: string;
}

export interface PRCommentCommandContext extends WithPRMeta {
  type: 'comment';
  author: string;
  body: string;
  path?: string;
  diffHunk?: string;
}

export interface PRCommandContext extends WithPRMeta {
  type: 'pr';
}

export interface IssueMeta {
  number: number;
  title: string;
  body: string;
  repoOwnerName: string;
  defaultBranch: string;
}

interface WithIssueMeta {
  issueMeta: IssueMeta;
}

export interface IssueCommandContext extends WithIssueMeta {
  type: 'issue';
}

export interface IssueCommentCommandContext extends WithIssueMeta {
  type: 'issueComment';
  author: string;
  body: string;
}

export type CommandContext =
  | PRReviewCommandContext
  | PRCommentCommandContext
  | PRCommandContext
  | IssueCommandContext
  | IssueCommentCommandContext;

export const REVIEW_COMMENT_COMMANDS = [
  'validate',
  'fix',
  'explain',
  'custom',
] as const;
export type ReviewCommentCommand = (typeof REVIEW_COMMENT_COMMANDS)[number];

export const ISSUE_COMMANDS = ['fix', 'explain', 'custom'] as const;
export type IssueCommand = (typeof ISSUE_COMMANDS)[number];

export const PR_COMMANDS = ['review', 'explain', 'custom'] as const;
export type PrCommand = (typeof PR_COMMANDS)[number];

export const ISSUE_COMMENT_COMMANDS = ['explain', 'custom'] as const;
export type IssueCommentCommand = (typeof ISSUE_COMMENT_COMMANDS)[number];

export type ClaudeCommand =
  | ReviewCommentCommand
  | IssueCommand
  | PrCommand
  | IssueCommentCommand;

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

export interface WsBatchExecuteMessage {
  type: 'batchExecute';
  requestId: string;
  workingDir: string;
  command: ClaudeCommand;
  contexts:
    | (PRReviewCommandContext | PRCommentCommandContext)[]
    | IssueCommentCommandContext[];
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
  | WsPlanApprovalResponseMessage
  | WsBatchExecuteMessage;

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

export interface WsFileChangesEvent {
  type: 'file_changes';
  requestId: string;
  changes: {
    files: FileChange[];
    summary: FileChangesSummary;
  };
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
  | WsPlanApprovalRequestEvent
  | WsFileChangesEvent;

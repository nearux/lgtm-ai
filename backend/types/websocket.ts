// ── Client → Server ──────────────────────────────────────────────────

export interface WsExecuteMessage {
  type: 'execute';
  requestId: string;
  prompt: string;
  workingDir: string;
}

export interface WsAbortMessage {
  type: 'abort';
  requestId: string;
}

export type WsClientMessage = WsExecuteMessage | WsAbortMessage;

// ── Server → Client ──────────────────────────────────────────────────

export interface WsTextEvent {
  type: 'text';
  requestId: string;
  chunk: string;
}

export interface WsToolStartEvent {
  type: 'tool_start';
  requestId: string;
  toolId: string;
  toolName: string;
}

export interface WsToolCompleteEvent {
  type: 'tool_complete';
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
}

export interface WsErrorEvent {
  type: 'error';
  requestId?: string;
  message: string;
}

export type WsServerMessage =
  | WsTextEvent
  | WsToolStartEvent
  | WsToolCompleteEvent
  | WsToolResultEvent
  | WsStderrEvent
  | WsDoneEvent
  | WsErrorEvent;

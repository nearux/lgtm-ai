import type WebSocket from 'ws';
import { ClaudeProcess } from './ClaudeProcess.js';
import { WebSocketSender } from './WebSocketSender.js';
import type { ClaudeExecuteOptions } from '../../types/claude.js';

export class ClaudeSessionManager {
  private processes = new Map<string, ClaudeProcess>();
  private sender: WebSocketSender;

  constructor(ws: WebSocket) {
    this.sender = new WebSocketSender(ws);
  }

  execute(
    requestId: string,
    prompt: string,
    workingDir: string,
    options: ClaudeExecuteOptions = {}
  ): void {
    const { sender } = this;
    if (this.processes.has(requestId)) {
      sender.send({
        type: 'error',
        requestId,
        message: `Request ${requestId} is already in progress`,
      });
      return;
    }

    if (!prompt || !workingDir) {
      sender.send({
        type: 'error',
        requestId,
        message: 'prompt and workingDir are required',
      });
      return;
    }

    const proc = new ClaudeProcess(workingDir, options);
    this.processes.set(requestId, proc);
    proc.sendInitialize(requestId);
    proc.sendPermissionMode(options.permissionMode ?? 'default');
    proc.sendPrompt(prompt);

    proc.on('text', (chunk) => sender.send({ type: 'text', requestId, chunk }));
    proc.on('tool_message', (toolId, toolName, input) =>
      sender.send({ type: 'tool_message', requestId, toolId, toolName, input })
    );
    proc.on('tool_result', (toolId, content, isError) =>
      sender.send({ type: 'tool_result', requestId, toolId, content, isError })
    );
    proc.on(
      'approval_request',
      (approvalRequestId, toolUseId, toolName, input) =>
        sender.send({
          type: 'approval_request',
          requestId,
          approvalRequestId,
          toolUseId,
          toolName,
          input,
        })
    );
    proc.on('stderr', (chunk) =>
      sender.send({ type: 'stderr', requestId, chunk })
    );
    proc.on('done', (exitCode) => {
      sender.send({ type: 'done', requestId, exitCode });
      this.processes.delete(requestId);
    });
    proc.on('error', (message) => {
      sender.send({ type: 'error', requestId, message });
      this.processes.delete(requestId);
    });
  }

  respondToApproval(
    requestId: string,
    approvalRequestId: string,
    behavior: 'allow' | 'deny',
    message?: string,
    updatedInput?: unknown
  ): void {
    this.processes
      .get(requestId)
      ?.sendApprovalResponse(
        approvalRequestId,
        behavior,
        message,
        updatedInput
      );
  }

  abort(requestId: string): void {
    this.processes.get(requestId)?.abort();
  }

  abortAll(): void {
    for (const proc of this.processes.values()) {
      proc.abort();
    }
    this.processes.clear();
  }
}

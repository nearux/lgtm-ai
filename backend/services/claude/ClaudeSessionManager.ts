import type WebSocket from 'ws';
import { ClaudeProcess } from './ClaudeProcess.js';
import { WebSocketSender } from './WebSocketSender.js';

export class ClaudeSessionManager {
  private processes = new Map<string, ClaudeProcess>();
  private sender: WebSocketSender;

  constructor(ws: WebSocket) {
    this.sender = new WebSocketSender(ws);
  }

  execute(requestId: string, prompt: string, workingDir: string): void {
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

    const proc = new ClaudeProcess(prompt, workingDir);
    this.processes.set(requestId, proc);

    proc.on('text', (chunk) => sender.send({ type: 'text', requestId, chunk }));
    proc.on('tool_start', (toolId, toolName) =>
      sender.send({ type: 'tool_start', requestId, toolId, toolName })
    );
    proc.on('tool_complete', (toolId, toolName, input) =>
      sender.send({ type: 'tool_complete', requestId, toolId, toolName, input })
    );
    proc.on('tool_result', (toolId, content, isError) =>
      sender.send({ type: 'tool_result', requestId, toolId, content, isError })
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

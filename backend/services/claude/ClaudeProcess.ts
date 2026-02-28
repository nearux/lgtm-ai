import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { LineBuffer } from './lineBuffer.js';
import { parseStreamJsonLine } from './streamJsonParser.js';

export interface ClaudeStreamEvents {
  text: [chunk: string];
  stderr: [chunk: string];
  done: [exitCode: number];
  error: [message: string];
  tool_message: [toolId: string, toolName: string, input: unknown];
  tool_result: [toolId: string, content: string, isError: boolean];
}

/**
 * Represents an active Claude Code CLI session.
 *
 * Extends EventEmitter with strongly-typed events and explicit lifecycle
 * management via `abort()`.
 *
 * Emitted events:
 *  - `data`          – extracted text from an assistant message
 *  - `tool_message` – a tool call has completed with input (toolId, toolName, input)
 *  - `tool_result`   – tool execution result received (toolId, content, isError)
 *  - `done`          – process exited cleanly (payload: exit code)
 *  - `error`         – spawn failure or non-zero exit (payload: message)
 */
export class ClaudeProcess extends EventEmitter<ClaudeStreamEvents> {
  private readonly childProcess: ChildProcess | null = null;
  private readonly lineBuffer = new LineBuffer();

  constructor(prompt: string, workingDir: string) {
    super();

    let child: ChildProcess;
    try {
      child = spawn(
        'claude',
        [
          '-p',
          prompt,
          '--output-format=stream-json',
          '--verbose',
          '--include-partial-messages',
        ],
        { cwd: workingDir, stdio: ['ignore', 'pipe', 'pipe'] }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Emit asynchronously so callers can attach listeners first
      process.nextTick(() =>
        this.emit('error', `Failed to spawn claude: ${message}`)
      );
      return;
    }

    this.childProcess = child;

    child.stdout!.on('data', (chunk: Buffer) => this.handleChunk(chunk));
    child.stderr!.on('data', (chunk: Buffer) =>
      this.emit('stderr', chunk.toString())
    );
    child.on('error', (err) =>
      this.emit('error', `Process error: ${err.message}`)
    );
    child.on('close', (code) => this.handleClose(code));
  }

  abort(): void {
    this.childProcess?.kill();
  }

  private handleChunk(chunk: Buffer): void {
    for (const line of this.lineBuffer.push(chunk.toString())) {
      this.emitParsedLine(line);
    }
  }

  private handleClose(code: number | null): void {
    const remaining = this.lineBuffer.flush();
    if (remaining.trim()) {
      this.emitParsedLine(remaining);
    }

    if (code === 0 || code === null) {
      this.emit('done', code ?? 0);
    } else {
      this.emit('error', `Process exited with code ${code}`);
    }
  }

  private emitParsedLine(line: string): void {
    const result = parseStreamJsonLine(line);
    if (!result) return;

    switch (result.kind) {
      case 'text':
        this.emit('text', result.text);
        break;
      case 'tool_complete':
        this.emit('tool_message', result.toolId, result.toolName, result.input);
        break;
      case 'tool_result':
        this.emit('tool_result', result.toolId, result.content, result.isError);
        break;
    }
  }
}

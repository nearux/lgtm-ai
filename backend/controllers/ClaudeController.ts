import { Controller, Route, Post, Body, Tags, Request, Produces } from 'tsoa';
import type * as express from 'express';
import { ClaudeProcess } from '../services/claude/ClaudeProcess.js';

export interface ExecuteClaudeBody {
  /** The prompt to send to Claude Code CLI */
  prompt: string;
  /** Working directory for the Claude process */
  workingDir: string;
}

@Route('api/claude')
@Tags('Claude')
export class ClaudeController extends Controller {
  /**
   * Execute Claude Code CLI and stream output as Server-Sent Events.
   *
   * SSE event types:
   * - `text`          – parsed assistant text from stdout
   * - `tool_start`    – tool call started (data: JSON { toolId, toolName })
   * - `tool_complete` – tool call completed with input (data: JSON { toolId, toolName, input })
   * - `tool_result`   – tool execution result (data: JSON { toolId, content, isError })
   * - `stderr`        – raw stderr output
   * - `done`          – process exited successfully (data: exit code)
   * - `error`         – process exited with non-zero code or failed to spawn
   */
  @Post('/execute')
  @Produces('text/event-stream')
  public async execute(
    @Body() body: ExecuteClaudeBody,
    @Request() request: express.Request
  ): Promise<void> {
    const res = request.res!;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (event: string, data: string) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const stream = new ClaudeProcess(body.prompt, body.workingDir);

    stream.on('text', (chunk) => sendEvent('text', chunk));
    stream.on('tool_start', (toolId, toolName) =>
      sendEvent('tool_start', JSON.stringify({ toolId, toolName }))
    );
    stream.on('tool_complete', (toolId, toolName, input) =>
      sendEvent('tool_complete', JSON.stringify({ toolId, toolName, input }))
    );
    stream.on('tool_result', (toolId, content, isError) =>
      sendEvent('tool_result', JSON.stringify({ toolId, content, isError }))
    );
    stream.on('stderr', (chunk) => sendEvent('stderr', chunk));
    stream.on('done', (code) => {
      sendEvent('done', String(code));
      res.end();
    });
    stream.on('error', (message) => {
      sendEvent('error', message);
      res.end();
    });

    res.on('close', () => stream.abort());
  }
}

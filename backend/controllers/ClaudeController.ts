import { Controller, Route, Post, Body, Tags, Request, Produces } from 'tsoa';
import type * as express from 'express';
import { executeClaudeStream } from '../services/claude.js';

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
   * - `data`  – a chunk of stdout/stderr output
   * - `done`  – process exited successfully (data: exit code)
   * - `error` – process exited with non-zero code or failed to spawn
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

    const stream = executeClaudeStream(body.prompt, body.workingDir);

    stream.on('data', (chunk) => sendEvent('data', chunk));
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

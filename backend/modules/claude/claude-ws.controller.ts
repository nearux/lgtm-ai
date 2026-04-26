import type WebSocket from 'ws';
import { inject, injectable } from 'inversify';
import { ClaudeSessionManager } from './claude-session-manager.js';
import { toUtf8 } from './ws-raw-data.util.js';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildBatchUserPrompt,
} from './prompt-builder.util.js';
import { ChatSessionsService } from '../projects/chat-sessions.service.js';
import { GitService } from '../projects/git.service.js';
import type {
  WsClientMessage,
  WsCommandExecuteMessage,
  WsBatchExecuteMessage,
  WsFollowUpExecuteMessage,
  WsAbortMessage,
  WsApprovalResponseMessage,
  WsPlanApprovalResponseMessage,
} from '../../types/claude.js';

@injectable()
export class ClaudeWSController {
  constructor(
    @inject(ChatSessionsService)
    private readonly chatSessionsService: ChatSessionsService,
    @inject(GitService)
    private readonly gitService: GitService
  ) {}

  handleConnection(ws: WebSocket): void {
    const manager = new ClaudeSessionManager(
      ws,
      this.chatSessionsService,
      this.gitService
    );

    ws.on('message', (rawData) => {
      const text = toUtf8(rawData);

      let msg: WsClientMessage;
      try {
        msg = JSON.parse(text) as WsClientMessage;
      } catch {
        ws.send(
          JSON.stringify({ type: 'error', message: 'Invalid JSON message' })
        );
        return;
      }

      this.routeMessage(msg, manager, ws);
    });

    ws.on('close', () => {
      manager.abortAll();
    });

    ws.on('error', (err) => {
      console.error('[WS] Connection error:', err.message);
      manager.abortAll();
    });
  }

  private routeMessage(
    msg: WsClientMessage,
    manager: ClaudeSessionManager,
    ws: WebSocket
  ): void {
    switch (msg.type) {
      case 'execute':
        return this.handleExecute(msg, manager, ws);
      case 'batchExecute':
        return this.handleBatchExecute(msg, manager, ws);
      case 'followUp':
        return this.handleFollowUp(msg, manager);
      case 'abort':
        return this.handleAbort(msg, manager);
      case 'approval_response':
        return this.handleApprovalResponse(msg, manager);
      case 'plan_approval_response':
        return this.handlePlanApprovalResponse(msg, manager);
      default: {
        msg satisfies never;
        ws.send(
          JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${(msg as { type: string }).type}`,
          })
        );
      }
    }
  }

  private handleExecute(
    msg: WsCommandExecuteMessage,
    manager: ClaudeSessionManager,
    ws: WebSocket
  ): void {
    const { requestId, workingDir, options, chatContext } = msg;

    let userPrompt: string;
    let systemPrompt: string;
    try {
      systemPrompt = buildSystemPrompt(msg.context);
      userPrompt = buildUserPrompt(msg.command, msg.context, msg.customPrompt);
    } catch (err) {
      this.sendError(ws, requestId, err);
      return;
    }

    manager.execute({
      requestId,
      prompt: userPrompt,
      workingDir,
      options,
      chatContext,
      commandMeta: { command: msg.command, customPrompt: msg.customPrompt },
      systemPrompt,
    });
  }

  private handleBatchExecute(
    msg: WsBatchExecuteMessage,
    manager: ClaudeSessionManager,
    ws: WebSocket
  ): void {
    const {
      requestId,
      workingDir,
      options,
      chatContext,
      command,
      contexts,
      customPrompt,
    } = msg;

    if (!contexts || contexts.length === 0) {
      ws.send(
        JSON.stringify({
          type: 'error',
          requestId,
          message: 'contexts must be a non-empty array',
        })
      );
      return;
    }

    let userPrompt: string;
    let systemPrompt: string;
    try {
      systemPrompt = buildSystemPrompt(contexts[0]);
      userPrompt = buildBatchUserPrompt(command, contexts, customPrompt);
    } catch (err) {
      this.sendError(ws, requestId, err);
      return;
    }

    manager.execute({
      requestId,
      prompt: userPrompt,
      workingDir,
      options,
      chatContext,
      commandMeta: { command, customPrompt },
      systemPrompt,
    });
  }

  private handleFollowUp(
    msg: WsFollowUpExecuteMessage,
    manager: ClaudeSessionManager
  ): void {
    manager.execute({
      requestId: msg.requestId,
      prompt: msg.message,
      workingDir: msg.workingDir,
      options: msg.options,
      chatContext: msg.chatContext,
    });
  }

  private handleAbort(
    msg: WsAbortMessage,
    manager: ClaudeSessionManager
  ): void {
    manager.abort(msg.requestId);
  }

  private handleApprovalResponse(
    msg: WsApprovalResponseMessage,
    manager: ClaudeSessionManager
  ): void {
    manager.respondToToolApproval(
      msg.requestId,
      msg.approvalRequestId,
      msg.behavior,
      msg.message,
      msg.updatedInput
    );
  }

  private handlePlanApprovalResponse(
    msg: WsPlanApprovalResponseMessage,
    manager: ClaudeSessionManager
  ): void {
    manager.respondToPlanApproval(
      msg.requestId,
      msg.approvalRequestId,
      msg.behavior,
      msg.message,
      msg.updatedInput
    );
  }

  private sendError(
    ws: WebSocket,
    requestId: string | undefined,
    err: unknown
  ): void {
    ws.send(
      JSON.stringify({
        type: 'error',
        requestId,
        message: err instanceof Error ? err.message : 'Failed to build prompt',
      })
    );
  }
}

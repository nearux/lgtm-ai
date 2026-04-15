import type WebSocket from 'ws';
import { ClaudeSessionManager } from '../services/claude/ClaudeSessionManager.js';
import {
  buildSystemPrompt,
  buildUserPrompt,
} from '../services/promptBuilder.js';
import type {
  WsClientMessage,
  WsCommandExecuteMessage,
} from '../types/claude.js';

export function handleClaudeWebSocket(ws: WebSocket): void {
  const manager = new ClaudeSessionManager(ws);

  ws.on('message', (rawData) => {
    let msg: WsClientMessage;
    try {
      msg = JSON.parse(rawData.toString()) as WsClientMessage;
    } catch {
      ws.send(
        JSON.stringify({ type: 'error', message: 'Invalid JSON message' })
      );
      return;
    }

    if (msg.type === 'abort') {
      manager.abort(msg.requestId);
      return;
    }

    if (msg.type === 'followUp') {
      manager.execute(
        msg.requestId,
        msg.message,
        msg.workingDir,
        msg.options,
        msg.chatContext
      );
      return;
    }

    if (msg.type === 'execute') {
      const { requestId, workingDir, options, chatContext } = msg;

      const cmdMsg = msg as WsCommandExecuteMessage;
      let userPrompt: string;
      let systemPrompt: string;
      try {
        systemPrompt = buildSystemPrompt(cmdMsg.context);
        userPrompt = buildUserPrompt(
          cmdMsg.command,
          cmdMsg.context,
          cmdMsg.customPrompt
        );
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: 'error',
            requestId,
            message:
              err instanceof Error ? err.message : 'Failed to build prompt',
          })
        );
        return;
      }

      manager.execute(
        requestId,
        userPrompt,
        workingDir,
        options,
        chatContext,
        {
          command: cmdMsg.command,
          customPrompt: cmdMsg.customPrompt,
        },
        systemPrompt
      );
      return;
    }

    if (msg.type === 'approval_response') {
      const { requestId, approvalRequestId, behavior, message, updatedInput } =
        msg;
      manager.respondToToolApproval(
        requestId,
        approvalRequestId,
        behavior,
        message,
        updatedInput
      );
      return;
    }

    if (msg.type === 'plan_approval_response') {
      const { requestId, approvalRequestId, behavior, message, updatedInput } =
        msg;
      manager.respondToPlanApproval(
        requestId,
        approvalRequestId,
        behavior,
        message,
        updatedInput
      );
      return;
    }

    ws.send(
      JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${(msg as { type: string }).type}`,
      })
    );
  });

  ws.on('close', () => {
    manager.abortAll();
  });

  ws.on('error', (err) => {
    console.error('[WS] Connection error:', err.message);
    manager.abortAll();
  });
}

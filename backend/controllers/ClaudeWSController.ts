import type WebSocket from 'ws';
import { ClaudeSessionManager } from '../services/claude/ClaudeSessionManager.js';
import { toUtf8 } from '../utils/wsRawData.js';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildBatchUserPrompt,
} from '../modules/claude/prompt-builder.util.js';
import type {
  WsClientMessage,
  WsCommandExecuteMessage,
  WsBatchExecuteMessage,
  WsFollowUpExecuteMessage,
  WsAbortMessage,
  WsApprovalResponseMessage,
  WsPlanApprovalResponseMessage,
} from '../types/claude.js';

export function handleClaudeWebSocket(ws: WebSocket): void {
  const manager = new ClaudeSessionManager(ws);

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

    routeMessage(msg, manager, ws);
  });

  ws.on('close', () => {
    manager.abortAll();
  });

  ws.on('error', (err) => {
    console.error('[WS] Connection error:', err.message);
    manager.abortAll();
  });
}

function routeMessage(
  msg: WsClientMessage,
  manager: ClaudeSessionManager,
  ws: WebSocket
): void {
  switch (msg.type) {
    case 'execute':
      return handleExecute(msg, manager, ws);
    case 'batchExecute':
      return handleBatchExecute(msg, manager, ws);
    case 'followUp':
      return handleFollowUp(msg, manager);
    case 'abort':
      return handleAbort(msg, manager);
    case 'approval_response':
      return handleApprovalResponse(msg, manager);
    case 'plan_approval_response':
      return handlePlanApprovalResponse(msg, manager);
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

function handleExecute(
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
    sendError(ws, requestId, err);
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

function handleBatchExecute(
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
    sendError(ws, requestId, err);
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

function handleFollowUp(
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

function handleAbort(msg: WsAbortMessage, manager: ClaudeSessionManager): void {
  manager.abort(msg.requestId);
}

function handleApprovalResponse(
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

function handlePlanApprovalResponse(
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

function sendError(
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

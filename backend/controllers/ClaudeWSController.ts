import type WebSocket from 'ws';
import { ClaudeSessionManager } from '../services/claude/ClaudeSessionManager.js';
import type { WsClientMessage } from '../types/claude.js';

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

    if (msg.type === 'execute') {
      const { requestId, prompt, workingDir, options } = msg;
      manager.execute(requestId, prompt, workingDir, options);
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

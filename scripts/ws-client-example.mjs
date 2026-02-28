#!/usr/bin/env node
/**
 * Example WebSocket client for the Claude execution endpoint.
 *
 * Usage:
 *   node scripts/ws-client-example.mjs [workingDir] [prompt]
 *
 * Examples:
 *   node scripts/ws-client-example.mjs /tmp "List files in this directory"
 *   node scripts/ws-client-example.mjs /tmp  # uses default prompt
 */

import { WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';

const WS_URL = 'ws://localhost:5051/api/claude/execute';

const workingDir = process.argv[2] ?? process.cwd();
const prompt =
  process.argv[3] ??
  'List the files in the current directory and summarize what you see.';
const requestId = randomUUID();

console.log(`Connecting to ${WS_URL}`);
console.log(`requestId : ${requestId}`);
console.log(`workingDir: ${workingDir}`);
console.log(`prompt    : ${prompt}`);
console.log('─'.repeat(60));

const ws = new WebSocket(WS_URL);

// ── Connection opened ─────────────────────────────────────────
ws.on('open', () => {
  console.log('[open] WebSocket connected\n');

  /** @type {import('../backend/types/websocket.js').WsExecuteMessage} */
  const executeMsg = {
    type: 'execute',
    requestId,
    prompt,
    workingDir,
  };

  ws.send(JSON.stringify(executeMsg));
  console.log('[sent] execute message\n');
});

// ── Incoming messages ─────────────────────────────────────────
ws.on('message', (rawData) => {
  /** @type {import('../backend/types/websocket.js').WsServerMessage} */
  const msg = JSON.parse(rawData.toString());

  switch (msg.type) {
    case 'text':
      process.stdout.write(msg.chunk);
      break;

    case 'tool_message':
      console.log(
        `[tool_message] ${msg.toolName} — input:`,
        JSON.stringify(msg.input, null, 2)
      );
      break;

    case 'tool_result':
      console.log(
        `[tool_result] ${msg.toolId} ${msg.isError ? '(error)' : '(ok)'}: ${msg.content.slice(0, 200)}${msg.content.length > 200 ? '…' : ''}`
      );
      break;

    case 'stderr':
      process.stderr.write(`[stderr] ${msg.chunk}`);
      break;

    case 'done':
      console.log(`\n\n[done] exitCode: ${msg.exitCode}`);
      ws.close();
      break;

    case 'error':
      console.error(`\n[error] ${msg.message}`);
      ws.close(1011, msg.message);
      break;

    default:
      console.warn('[unknown]', msg);
  }
});

// ── Connection closed ─────────────────────────────────────────
ws.on('close', (code, reason) => {
  console.log(`\n[close] code=${code} reason=${reason || '(none)'}`);
});

// ── Connection error ──────────────────────────────────────────
ws.on('error', (err) => {
  console.error('[error]', err.message);
  process.exit(1);
});

// ── Graceful abort on Ctrl-C ──────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[SIGINT] Aborting request…');

  /** @type {import('../backend/types/websocket.js').WsAbortMessage} */
  const abortMsg = { type: 'abort', requestId };
  ws.send(JSON.stringify(abortMsg));

  setTimeout(() => ws.close(), 500);
});

#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';

const DEFAULTS = {
  baseUrl: 'http://localhost:5051',
  workingDir: process.cwd(),
  prNumber: 45,
  scopeType: 'REVIEW',
  scopeTargetId: `e2e-${Date.now()}`,
  title: 'E2E chat session test',
  prompt: 'Please reply with exactly: E2E_OK',
  projectName: `e2e-chat-session-${Date.now()}`,
  projectDescription: 'Temporary project for chat session metadata E2E',
  executionMode: 'default',
  healthTimeoutMs: 30_000,
  wsTimeoutMs: 180_000,
  pollAttempts: 20,
  pollIntervalMs: 1_000,
  keepProject: false,
};

function printHelp() {
  console.log(`
Usage:
  node scripts/pr-chat-session-e2e.mjs [options]

Options:
  --base-url <url>            Backend base URL (default: ${DEFAULTS.baseUrl})
  --working-dir <path>        Working directory passed to execute (default: cwd)
  --pr-number <number>        PR number for chat metadata (default: ${DEFAULTS.prNumber})
  --scope-type <REVIEW|COMMENT>
  --scope-target-id <id>      Upstream review/comment id used for filtering
  --title <text>              Session title metadata
  --prompt <text>             Prompt sent to Claude
  --project-name <text>       Temporary project name
  --project-description <text>
  --model <name>              Optional Claude model
  --execution-mode <mode>     default | acceptEdits | bypassPermissions | plan
  --health-timeout-ms <ms>    Max wait for /health readiness
  --ws-timeout-ms <ms>        Max wait for websocket execution
  --poll-attempts <n>         Poll retries for list/history endpoints
  --poll-interval-ms <ms>     Poll interval for list/history endpoints
  --keep-project              Do not delete created project at the end
  --help                      Show this help

Examples:
  pnpm --filter lgtmai-scripts exec node pr-chat-session-e2e.mjs --working-dir /abs/repo/path
  pnpm --filter lgtmai-scripts exec node pr-chat-session-e2e.mjs --pr-number 123 --scope-type COMMENT --scope-target-id comment-42
`);
}

function parseInteger(raw, flagName) {
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer for ${flagName}: ${raw}`);
  }
  return parsed;
}

function parseArgs(argv) {
  const config = { ...DEFAULTS };
  const args = [...argv];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--help') {
      config.help = true;
      continue;
    }

    if (arg === '--keep-project') {
      config.keepProject = true;
      continue;
    }

    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }

    if (arg === '--base-url') {
      config.baseUrl = next;
      i += 1;
      continue;
    }

    if (arg === '--working-dir') {
      config.workingDir = next;
      i += 1;
      continue;
    }

    if (arg === '--pr-number') {
      config.prNumber = parseInteger(next, '--pr-number');
      i += 1;
      continue;
    }

    if (arg === '--scope-type') {
      config.scopeType = next;
      i += 1;
      continue;
    }

    if (arg === '--scope-target-id') {
      config.scopeTargetId = next;
      i += 1;
      continue;
    }

    if (arg === '--title') {
      config.title = next;
      i += 1;
      continue;
    }

    if (arg === '--prompt') {
      config.prompt = next;
      i += 1;
      continue;
    }

    if (arg === '--project-name') {
      config.projectName = next;
      i += 1;
      continue;
    }

    if (arg === '--project-description') {
      config.projectDescription = next;
      i += 1;
      continue;
    }

    if (arg === '--model') {
      config.model = next;
      i += 1;
      continue;
    }

    if (arg === '--execution-mode') {
      config.executionMode = next;
      i += 1;
      continue;
    }

    if (arg === '--health-timeout-ms') {
      config.healthTimeoutMs = parseInteger(next, '--health-timeout-ms');
      i += 1;
      continue;
    }

    if (arg === '--ws-timeout-ms') {
      config.wsTimeoutMs = parseInteger(next, '--ws-timeout-ms');
      i += 1;
      continue;
    }

    if (arg === '--poll-attempts') {
      config.pollAttempts = parseInteger(next, '--poll-attempts');
      i += 1;
      continue;
    }

    if (arg === '--poll-interval-ms') {
      config.pollIntervalMs = parseInteger(next, '--poll-interval-ms');
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const normalizedBaseUrl = config.baseUrl.replace(/\/+$/, '');
  const normalizedWorkingDir = path.resolve(config.workingDir);

  if (config.scopeType !== 'REVIEW' && config.scopeType !== 'COMMENT') {
    throw new Error(
      `--scope-type must be REVIEW or COMMENT (got: ${config.scopeType})`
    );
  }

  return {
    ...config,
    baseUrl: normalizedBaseUrl,
    workingDir: normalizedWorkingDir,
  };
}

function toWsUrl(baseUrl) {
  const wsUrl = new URL(baseUrl);
  wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  wsUrl.pathname = '/api/claude/execute';
  wsUrl.search = '';
  return wsUrl.toString();
}

async function requestJson(url, init) {
  const response = await fetch(url, init);
  const raw = await response.text();

  let body;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = raw;
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? body.message
        : raw || response.statusText;
    throw new Error(
      `HTTP ${response.status} ${response.statusText}: ${message}`
    );
  }

  return body;
}

async function waitForHealth(baseUrl, timeoutMs) {
  const healthUrl = `${baseUrl}/health`;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const body = await requestJson(healthUrl);
      if (body?.status === 'ok') return;
    } catch {
      // Retry until timeout.
    }
    await sleep(1_000);
  }

  throw new Error(
    `Backend health check timed out after ${timeoutMs}ms (${healthUrl})`
  );
}

async function pollWithRetry(taskName, attempts, intervalMs, fn) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(intervalMs);
      }
    }
  }

  throw new Error(
    `${taskName} failed after ${attempts} attempts: ${lastError?.message ?? 'unknown error'}`
  );
}

async function runClaudeExecution({
  wsUrl,
  prompt,
  workingDir,
  executionMode,
  model,
  chatContext,
  timeoutMs,
}) {
  const requestId = randomUUID();

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const chunks = [];
    let initSessionId;
    let settled = false;
    let timeout;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      ws.removeAllListeners();
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const succeed = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    timeout = setTimeout(() => {
      fail(new Error(`WebSocket execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    ws.on('open', () => {
      const options = {
        executionMode,
        ...(model ? { model } : {}),
      };

      const message = {
        type: 'execute',
        requestId,
        prompt,
        workingDir,
        options,
        chatContext,
      };

      ws.send(JSON.stringify(message));
    });

    ws.on('message', (rawData) => {
      let msg;
      try {
        msg = JSON.parse(rawData.toString());
      } catch {
        return;
      }

      if (msg.type === 'text') {
        chunks.push(msg.chunk);
        return;
      }

      if (msg.type === 'init') {
        initSessionId = msg.sessionId;
        return;
      }

      if (msg.type === 'approval_request') {
        ws.send(
          JSON.stringify({
            type: 'approval_response',
            requestId: msg.requestId,
            approvalRequestId: msg.approvalRequestId,
            behavior: 'allow',
          })
        );
        return;
      }

      if (msg.type === 'plan_approval_request') {
        ws.send(
          JSON.stringify({
            type: 'plan_approval_response',
            requestId: msg.requestId,
            approvalRequestId: msg.approvalRequestId,
            behavior: 'allow',
          })
        );
        return;
      }

      if (msg.type === 'error') {
        fail(new Error(`WebSocket error: ${msg.message}`));
        return;
      }

      if (msg.type === 'done') {
        succeed({
          requestId,
          exitCode: msg.exitCode,
          result: msg.result,
          initSessionId,
          doneSessionId: msg.sessionId,
          output: chunks.join(''),
        });
      }
    });

    ws.on('error', (error) => {
      fail(new Error(`WebSocket transport error: ${error.message}`));
    });

    ws.on('close', (code, reasonBuffer) => {
      if (settled) return;
      const reason = reasonBuffer?.toString() || '(none)';
      fail(
        new Error(
          `WebSocket closed before completion (code=${code}, reason=${reason})`
        )
      );
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const wsUrl = toWsUrl(args.baseUrl);

  console.log(`[1/6] Waiting for backend health: ${args.baseUrl}/health`);
  await waitForHealth(args.baseUrl, args.healthTimeoutMs);

  console.log(
    `[2/6] Creating temporary project (working_dir=${args.workingDir})`
  );
  const project = await requestJson(`${args.baseUrl}/api/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: args.projectName,
      description: args.projectDescription,
      working_dir: args.workingDir,
    }),
  });

  const projectId = project?.id;
  if (!projectId) {
    throw new Error('Project creation response did not include project id');
  }

  const chatContext = {
    projectId,
    prNumber: args.prNumber,
    scopeType: args.scopeType,
    scopeTargetId: args.scopeTargetId,
    title: args.title,
  };

  let cleanupError;

  try {
    console.log(`[3/6] Running Claude execution via WebSocket: ${wsUrl}`);
    const execution = await runClaudeExecution({
      wsUrl,
      prompt: args.prompt,
      workingDir: args.workingDir,
      executionMode: args.executionMode,
      model: args.model,
      chatContext,
      timeoutMs: args.wsTimeoutMs,
    });

    if (execution.exitCode !== 0) {
      throw new Error(
        `Claude execution failed with exitCode=${execution.exitCode}`
      );
    }

    const claudeSessionId = execution.initSessionId ?? execution.doneSessionId;
    if (!claudeSessionId) {
      throw new Error('Claude execution completed without sessionId');
    }

    console.log(`[4/6] Polling chat session list until persisted`);
    const listUrl = `${args.baseUrl}/api/projects/${projectId}/prs/${args.prNumber}/chat-sessions`;
    const persistedSession = await pollWithRetry(
      'chat session list lookup',
      args.pollAttempts,
      args.pollIntervalMs,
      async () => {
        const sessions = await requestJson(listUrl);
        const match = sessions.find(
          (item) =>
            item.claudeSessionId === claudeSessionId &&
            item.scopeType === args.scopeType &&
            item.scopeTargetId === args.scopeTargetId
        );

        if (!match) {
          throw new Error(
            `Session for claudeSessionId=${claudeSessionId} not found yet`
          );
        }

        return match;
      }
    );

    console.log(`[5/6] Verifying filtered session query`);
    const filteredUrl =
      `${listUrl}?scopeType=${encodeURIComponent(args.scopeType)}` +
      `&scopeTargetId=${encodeURIComponent(args.scopeTargetId)}`;
    const filteredSessions = await requestJson(filteredUrl);
    const filteredMatch = filteredSessions.find(
      (item) => item.id === persistedSession.id
    );
    if (!filteredMatch) {
      throw new Error('Filtered list did not include the persisted session');
    }

    console.log(`[6/6] Polling session history endpoint`);
    const historyUrl = `${listUrl}/${persistedSession.id}/history`;
    const history = await pollWithRetry(
      'chat session history lookup',
      args.pollAttempts,
      args.pollIntervalMs,
      async () => {
        const body = await requestJson(historyUrl);
        if (body.claudeSessionId !== claudeSessionId) {
          throw new Error(
            `History claudeSessionId mismatch: expected ${claudeSessionId}, got ${body.claudeSessionId}`
          );
        }
        return body;
      }
    );

    const summary = {
      projectId,
      prNumber: args.prNumber,
      savedSessionId: persistedSession.id,
      claudeSessionId,
      scopeType: persistedSession.scopeType,
      scopeTargetId: persistedSession.scopeTargetId,
      historyEntries: Array.isArray(history.entries)
        ? history.entries.length
        : 0,
    };

    console.log('\nE2E verification passed.');
    console.log('\nHistory response:');
    console.log(JSON.stringify(history, null, 2));
    console.log('\nVerification summary:');
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (!args.keepProject) {
      try {
        await fetch(`${args.baseUrl}/api/projects/${projectId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        cleanupError = error;
      }
    }
  }

  if (cleanupError) {
    console.warn(`Cleanup warning: ${cleanupError.message}`);
  }
}

main().catch((error) => {
  console.error(`E2E verification failed: ${error.message}`);
  process.exit(1);
});

# Move Prompt Management to Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move LLM prompt assembly from the frontend to the backend, replacing the full prompt WebSocket payload with a `command` + `context` structure, and replacing raw prompt content in chat history with human-readable labels.

**Architecture:** The backend introduces a `promptBuilder` service that assembles prompts from a command enum and context object. The WebSocket message type is split into two structural shapes — command-based (new sessions) and follow-up (existing sessions). Chat history performs a read-time substitution of the first user message using the command stored in the DB. Session metadata is persisted on the `init` event (not `done`) in `ClaudeSessionManager`.

**Tech Stack:** TypeScript, Express, Prisma (SQLite), React 19, WebSocket (ws library), Vitest

---

## File Map

### New Files
- `backend/services/promptBuilder.ts` — assembles prompts from command + context
- `backend/services/promptBuilder.test.ts` — tests for prompt builder

### Modified Files (Backend)
- `backend/types/claude.ts` — replace `WsExecuteMessage` with two-shape structural union; add `CommandContext` and `ClaudeCommand` types
- `backend/prisma/schema.prisma` — add `command String?` and `custom_prompt String?` to `ChatSession`
- `backend/types/chatSessions.ts` — add `command?` and `customPrompt?` to `ChatSessionSummary`
- `backend/dtos/chatSessionSummaryDto.ts` — map new fields in `fromModel`
- `backend/services/chatSessions.ts` — accept optional `commandMeta` in `createChatSessionFromExecution`; pass command/customPrompt to history builder
- `backend/services/claude/claudeSessionHistory.ts` — add `replaceFirstUserMessage` helper; update `getClaudeSessionHistory` signature
- `backend/services/claude/claudeSessionHistory.test.ts` — extend (do NOT overwrite) with new tests for `replaceFirstUserMessage`
- `backend/services/claude/ClaudeSessionManager.ts` — add `commandMeta` param to `execute()`; pass to `createChatSessionFromExecution` in `init` handler
- `backend/controllers/ClaudeWSController.ts` — narrow on `followUp` vs `command`; call promptBuilder; pass commandMeta to manager

### Modified Files (Frontend)
- `frontend/src/domains/PRDetail/utils/reviewPrompts.ts` — remove `buildPromptForAction`, `getExecutionMode`, `ReviewTarget`; keep `ACTION_LABELS`
- `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/types.ts` — add `CommandContext`, `ClaudeCommand`, `CommandPayload`, `FollowUpPayload` exports
- `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useClaudeWebSocket.ts` — update `execute()` signature
- `frontend/src/domains/PRDetail/hooks/useChatPanelSync.ts` — update follow-up handler
- `frontend/src/domains/PRDetail/components/ReviewList/ReviewList.tsx` — build `CommandContext`, remove prompt assembly
- `frontend/src/domains/PRDetail/components/ChatPanel/ActionSelector.tsx` — rename `'chat'` → `'custom'`

**Note:** `backend/repositories/chatSessionRepository.ts` — no code change needed. The `create()` function accepts `Prisma.ChatSessionUncheckedCreateInput` which automatically includes the new Prisma-generated fields after migration. The spec lists it as "affected" because the Prisma-generated type changes, but no manual edits to the file are required.

---

## Task 1: Add `CommandContext` type and `promptBuilder` service (backend)

**Files:**
- Modify: `backend/types/claude.ts`
- Create: `backend/services/promptBuilder.ts`
- Create: `backend/services/promptBuilder.test.ts`

This task adds the new types and ports the existing frontend prompt logic to the backend with tests.

- [ ] **Step 1: Add `CommandContext` and `ClaudeCommand` to `backend/types/claude.ts`**

Add these two declarations before the existing `WsExecuteMessage` interface:

```typescript
export interface CommandContext {
  type: 'review' | 'comment';
  author: string;
  body: string;
  path?: string;
  prNumber: number;
}

export type ClaudeCommand = 'validate' | 'fix' | 'explain' | 'custom';
```

- [ ] **Step 2: Write failing tests**

Create `backend/services/promptBuilder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildPrompt } from './promptBuilder.js';
import type { CommandContext } from '../types/claude.js';

const reviewContext: CommandContext = {
  type: 'review',
  author: 'alice',
  body: 'This variable name is unclear',
  prNumber: 42,
};

const commentContext: CommandContext = {
  type: 'comment',
  author: 'bob',
  body: 'Missing null check here',
  path: 'src/utils/helper.ts',
  prNumber: 42,
};

describe('buildPrompt', () => {
  it('validate - review: contains VALID/INVALID instruction', () => {
    const result = buildPrompt('validate', reviewContext);
    expect(result).toContain('PR review comment');
    expect(result).toContain('alice');
    expect(result).toContain('This variable name is unclear');
    expect(result).toContain('VALID');
    expect(result).toContain('INVALID');
  });

  it('validate - comment: uses inline comment phrasing and includes path', () => {
    const result = buildPrompt('validate', commentContext);
    expect(result).toContain('inline code comment');
    expect(result).toContain('src/utils/helper.ts');
  });

  it('explain - review: contains explain instruction', () => {
    const result = buildPrompt('explain', reviewContext);
    expect(result).toContain('Explain this code review comment');
    expect(result).toContain('alice');
  });

  it('fix - review: contains fix instruction', () => {
    const result = buildPrompt('fix', reviewContext);
    expect(result).toContain('Fix the code based on this review');
    expect(result).toContain('Do NOT use git commands');
  });

  it('custom: wraps customPrompt with context preamble', () => {
    const result = buildPrompt('custom', reviewContext, 'What is the impact?');
    expect(result).toContain('What is the impact?');
    expect(result).toContain('alice');
    expect(result).toContain('This variable name is unclear');
    expect(result).toContain('#42');
  });

  it('custom: throws if customPrompt is missing', () => {
    expect(() => buildPrompt('custom', reviewContext)).toThrow('customPrompt is required');
  });

  it('comment type: throws if path is missing', () => {
    const noPath: CommandContext = { type: 'comment', author: 'x', body: 'y', prNumber: 1 };
    expect(() => buildPrompt('validate', noPath)).toThrow('path is required');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd backend && pnpm vitest run services/promptBuilder.test.ts
```

Expected: FAIL — `Cannot find module './promptBuilder.js'`

- [ ] **Step 4: Implement `promptBuilder.ts`**

Create `backend/services/promptBuilder.ts`:

```typescript
import type { CommandContext, ClaudeCommand } from '../types/claude.js';

function buildContextInfo(context: CommandContext): string {
  if (context.type === 'comment') {
    if (!context.path) {
      throw new Error('path is required for comment context');
    }
    return `PR Number: #${context.prNumber}
Comment Author: ${context.author}
File: ${context.path}
Comment:
${context.body}`;
  }
  return `PR Number: #${context.prNumber}
Review Author: ${context.author}
Review Body:
${context.body}`;
}

export function buildPrompt(
  command: ClaudeCommand,
  context: CommandContext,
  customPrompt?: string
): string {
  const contextInfo = buildContextInfo(context);
  const isReview = context.type === 'review';
  const targetLabel = isReview ? 'PR review comment' : 'inline code comment';
  const reviewLabel = isReview ? 'review comment' : 'inline comment';
  const shortLabel = isReview ? 'review' : 'comment';

  switch (command) {
    case 'validate':
      return `Review this ${targetLabel} and determine if it's a valid, actionable code review suggestion.

${contextInfo}

Analyze if this ${reviewLabel}:
1. Points out a real issue or valid improvement
2. Is actionable (can be addressed with code changes)
3. Is clear and specific enough to act upon

Respond with:
- "VALID" if the ${shortLabel} is legitimate and actionable
- "INVALID" if the ${shortLabel} is vague, incorrect, or not actionable

Then briefly explain your reasoning in 1-2 sentences.`;

    case 'explain':
      return `Explain this code review comment in simple terms.

${contextInfo}

Please explain:
1. What issue or suggestion is being raised
2. Why this might be important
3. What the reviewer expects to be changed

Use clear, beginner-friendly language.`;

    case 'fix':
      return `Fix the code based on this review comment.

${contextInfo}

Please analyze and fix the code according to this review.
- Make the minimal necessary changes
- Do NOT use git commands
- Only modify local files`;

    case 'custom': {
      if (!customPrompt || customPrompt.trim() === '') {
        throw new Error('customPrompt is required for custom command');
      }
      return `${customPrompt}

Context:
${contextInfo}`;
    }

    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && pnpm vitest run services/promptBuilder.test.ts
```

Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/types/claude.ts backend/services/promptBuilder.ts backend/services/promptBuilder.test.ts
git commit -m "feat: add CommandContext type and promptBuilder service"
```

---

## Task 2: Update `WsExecuteMessage` type and `ClaudeWSController` (backend)

**Files:**
- Modify: `backend/types/claude.ts`
- Modify: `backend/controllers/ClaudeWSController.ts`

These two changes are done together in one task to avoid a broken intermediate TypeScript state.

- [ ] **Step 1: Replace `WsExecuteMessage` in `backend/types/claude.ts`**

Replace the existing `WsExecuteMessage` interface with:

```typescript
export interface WsCommandExecuteMessage {
  type: 'execute';
  requestId: string;
  workingDir: string;
  command: ClaudeCommand;
  context: CommandContext;
  customPrompt?: string;
  options?: ClaudeExecuteOptions;
  chatContext?: ClaudeChatContext;
}

export interface WsFollowUpExecuteMessage {
  type: 'execute';
  requestId: string;
  workingDir: string;
  followUp: string;
  options?: ClaudeExecuteOptions;
  chatContext?: ClaudeChatContext;
}

export type WsExecuteMessage = WsCommandExecuteMessage | WsFollowUpExecuteMessage;
```

`WsClientMessage` union already references `WsExecuteMessage` — no change needed there.

- [ ] **Step 2: Update `ClaudeWSController.ts`**

Replace the content of `backend/controllers/ClaudeWSController.ts`:

```typescript
import type WebSocket from 'ws';
import { ClaudeSessionManager } from '../services/claude/ClaudeSessionManager.js';
import { buildPrompt } from '../services/promptBuilder.js';
import type { WsClientMessage, WsCommandExecuteMessage } from '../types/claude.js';

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
      const { requestId, workingDir, options, chatContext } = msg;

      if ('followUp' in msg) {
        // Shape B: follow-up for an existing session — use text directly
        manager.execute(requestId, msg.followUp, workingDir, options, chatContext);
        return;
      }

      // Shape A: command-based new session
      const cmdMsg = msg as WsCommandExecuteMessage;
      let prompt: string;
      try {
        prompt = buildPrompt(cmdMsg.command, cmdMsg.context, cmdMsg.customPrompt);
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: 'error',
            requestId,
            message: err instanceof Error ? err.message : 'Failed to build prompt',
          })
        );
        return;
      }

      manager.execute(
        requestId,
        prompt,
        workingDir,
        options,
        chatContext,
        { command: cmdMsg.command, customPrompt: cmdMsg.customPrompt }
      );
      return;
    }

    if (msg.type === 'approval_response') {
      const { requestId, approvalRequestId, behavior, message, updatedInput } = msg;
      manager.respondToToolApproval(requestId, approvalRequestId, behavior, message, updatedInput);
      return;
    }

    if (msg.type === 'plan_approval_response') {
      const { requestId, approvalRequestId, behavior, message, updatedInput } = msg;
      manager.respondToPlanApproval(requestId, approvalRequestId, behavior, message, updatedInput);
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
```

Note: `manager.execute()` is called with a 6th argument `commandMeta` — this will cause a TypeScript error until Task 3 updates `ClaudeSessionManager`. This is intentional; both tasks form one atomic change.

- [ ] **Step 3: Update `ClaudeSessionManager.execute()` to accept and thread `commandMeta`**

In `backend/services/claude/ClaudeSessionManager.ts`, update the `execute()` method:

```typescript
execute(
  requestId: string,
  prompt: string,
  workingDir: string,
  options: ClaudeExecuteOptions = {},
  chatContext?: ClaudeChatContext,
  commandMeta?: { command?: string; customPrompt?: string }
): void {
  // ... existing validation and process setup code unchanged ...

  proc.on('init', (sessionId) => {
    if (!options.sessionId && chatContext) {
      void createChatSessionFromExecution(chatContext, sessionId, commandMeta).catch(
        (error) => {
          console.error(
            '[ClaudeSessionManager] Failed to persist chat session:',
            error
          );
        }
      );
    }
    sender.send({ type: 'init', requestId, sessionId });
  });

  // ... rest of the method unchanged ...
}
```

Key change: `commandMeta` is added as the last optional parameter and passed to `createChatSessionFromExecution` inside the `init` handler (not `done`). The `done` handler stays unchanged.

- [ ] **Step 4: Build backend**

```bash
cd backend && pnpm build
```

Expected: Build succeeds. `createChatSessionFromExecution` will have a type error until Task 4 updates it — that's expected and will be fixed next.

- [ ] **Step 5: Commit**

```bash
git add backend/types/claude.ts backend/controllers/ClaudeWSController.ts backend/services/claude/ClaudeSessionManager.ts
git commit -m "feat: update WsExecuteMessage to command/followUp shapes and wire promptBuilder in controller"
```

---

## Task 3: Prisma migration — add command fields to ChatSession (backend)

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Update schema**

Add two nullable fields to the `ChatSession` model in `backend/prisma/schema.prisma`:

```prisma
model ChatSession {
  id                String               @id
  project_id        String
  pr_number         Int
  scope_type        ChatSessionScopeType
  scope_target_id   String
  claude_session_id String               @unique
  title             String?
  command           String?
  custom_prompt     String?
  created_at        DateTime
  updated_at        DateTime
  last_used_at      DateTime

  @@index([project_id, pr_number])
  @@index([project_id, pr_number, scope_type, scope_target_id])
}
```

- [ ] **Step 2: Run migration**

```bash
cd backend && pnpm prisma migrate dev --name add-command-to-chat-session
```

Expected: Migration created and applied. Prisma client regenerated with new `command` and `custom_prompt` fields on the `ChatSession` type.

- [ ] **Step 3: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add command and custom_prompt fields to ChatSession schema"
```

---

## Task 4: Update types, DTO, and session service (backend)

**Files:**
- Modify: `backend/types/chatSessions.ts`
- Modify: `backend/dtos/chatSessionSummaryDto.ts`
- Modify: `backend/services/chatSessions.ts`

- [ ] **Step 1: Update `ChatSessionSummary` type**

In `backend/types/chatSessions.ts`, add two optional fields to `ChatSessionSummary`:

```typescript
export interface ChatSessionSummary {
  id: string;
  projectId: string;
  prNumber: number;
  scopeType: ChatSessionScopeType;
  scopeTargetId: string;
  claudeSessionId: string;
  title?: string;
  command?: string;
  customPrompt?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}
```

- [ ] **Step 2: Update `ChatSessionSummaryDto`**

In `backend/dtos/chatSessionSummaryDto.ts`:

1. Add fields to the class:
```typescript
command?: string;
customPrompt?: string;
```

2. Update the constructor:
```typescript
this.command = data.command;
this.customPrompt = data.customPrompt;
```

3. Update `fromModel()` to map the new Prisma columns:
```typescript
static fromModel(model: ChatSession): ChatSessionSummaryDto {
  return new ChatSessionSummaryDto({
    id: model.id,
    projectId: model.project_id,
    prNumber: model.pr_number,
    scopeType: model.scope_type,
    scopeTargetId: model.scope_target_id,
    claudeSessionId: model.claude_session_id,
    ...(model.title ? { title: model.title } : {}),
    ...(model.command ? { command: model.command } : {}),
    ...(model.custom_prompt ? { customPrompt: model.custom_prompt } : {}),
    createdAt: model.created_at.toISOString(),
    updatedAt: model.updated_at.toISOString(),
    lastUsedAt: model.last_used_at.toISOString(),
  });
}
```

- [ ] **Step 3: Update `createChatSessionFromExecution()` signature**

In `backend/services/chatSessions.ts`, update the function signature and body:

```typescript
export async function createChatSessionFromExecution(
  context: ClaudeChatContext,
  claudeSessionId: string,
  commandMeta?: { command?: string; customPrompt?: string }
): Promise<ChatSessionSummary> {
  const now = new Date();
  const record = await chatSessionRepository.create({
    id: randomUUID(),
    project_id: context.projectId,
    pr_number: context.prNumber,
    scope_type: context.scopeType,
    scope_target_id: context.scopeTargetId,
    claude_session_id: claudeSessionId,
    title: context.title ?? null,
    ...(commandMeta?.command ? { command: commandMeta.command } : {}),
    ...(commandMeta?.customPrompt ? { custom_prompt: commandMeta.customPrompt } : {}),
    created_at: now,
    updated_at: now,
    last_used_at: now,
  });

  return ChatSessionSummaryDto.fromModel(record);
}
```

Note: Prisma column name is `custom_prompt` (snake_case); TypeScript interface field is `customPrompt` (camelCase).

- [ ] **Step 4: Build backend**

```bash
cd backend && pnpm build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 5: Commit**

```bash
git add backend/types/chatSessions.ts backend/dtos/chatSessionSummaryDto.ts backend/services/chatSessions.ts
git commit -m "feat: persist command metadata on chat session creation"
```

---

## Task 5: Replace first user message in history with command label (backend)

**Files:**
- Modify: `backend/services/claude/claudeSessionHistory.ts`
- Modify: `backend/services/claude/claudeSessionHistory.test.ts` (extend existing file)
- Modify: `backend/services/chatSessions.ts`

**IMPORTANT:** Do not overwrite `claudeSessionHistory.test.ts` — it has existing tests. Add a new `describe` block.

- [ ] **Step 1: Extend the test file with new tests for `replaceFirstUserMessage`**

In `backend/services/claude/claudeSessionHistory.test.ts`, append a new `describe` block after the existing one (after the closing `}`):

```typescript
import { replaceFirstUserMessage } from './claudeSessionHistory.js';
import type { ChatSessionHistoryEntry } from '../../types/chatSessions.js';

describe('replaceFirstUserMessage', () => {
  const entries: ChatSessionHistoryEntry[] = [
    { role: 'user', content: 'Review this PR review comment and determine...', timestamp: '2026-01-01T00:00:00Z' },
    { role: 'assistant', content: 'VALID — The comment is actionable.', timestamp: '2026-01-01T00:00:01Z' },
  ];

  it('replaces first user message with validate label', () => {
    const result = replaceFirstUserMessage(entries, 'validate');
    expect(result[0].content).toBe('Validate this review');
    expect(result[1].content).toBe('VALID — The comment is actionable.');
  });

  it('replaces first user message with explain label', () => {
    const result = replaceFirstUserMessage(entries, 'explain');
    expect(result[0].content).toBe('Explain this review');
  });

  it('replaces first user message with fix label', () => {
    const result = replaceFirstUserMessage(entries, 'fix');
    expect(result[0].content).toBe('Fix code based on this review');
  });

  it('replaces first user message with customPrompt for custom command', () => {
    const result = replaceFirstUserMessage(entries, 'custom', 'What is the impact?');
    expect(result[0].content).toBe('What is the impact?');
  });

  it('leaves entries unchanged when command is undefined', () => {
    const result = replaceFirstUserMessage(entries, undefined);
    expect(result[0].content).toBe('Review this PR review comment and determine...');
  });

  it('does not mutate the original entries array', () => {
    replaceFirstUserMessage(entries, 'validate');
    expect(entries[0].content).toBe('Review this PR review comment and determine...');
  });
});
```

Also update the import at the top of the file to add `replaceFirstUserMessage`:

```typescript
import { getClaudeSessionHistory, replaceFirstUserMessage } from './claudeSessionHistory.js';
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
cd backend && pnpm vitest run services/claude/claudeSessionHistory.test.ts
```

Expected: Existing tests PASS; new `replaceFirstUserMessage` tests FAIL — `replaceFirstUserMessage is not a function`

- [ ] **Step 3: Add `replaceFirstUserMessage` and update `getClaudeSessionHistory` in `claudeSessionHistory.ts`**

In `backend/services/claude/claudeSessionHistory.ts`:

1. Add the `COMMAND_LABELS` map and `replaceFirstUserMessage` export function before `getClaudeSessionHistory`:

```typescript
const COMMAND_LABELS: Record<string, string> = {
  validate: 'Validate this review',
  explain: 'Explain this review',
  fix: 'Fix code based on this review',
};

export function replaceFirstUserMessage(
  entries: ChatSessionHistoryEntry[],
  command?: string,
  customPrompt?: string
): ChatSessionHistoryEntry[] {
  if (!command) return entries;

  const label =
    command === 'custom'
      ? (customPrompt ?? entries[0]?.content ?? '')
      : (COMMAND_LABELS[command] ?? entries[0]?.content ?? '');

  return entries.map((entry, index) => {
    if (index === 0 && entry.role === 'user') {
      return { ...entry, content: label };
    }
    return entry;
  });
}
```

2. Update `getClaudeSessionHistory` signature to accept command/customPrompt params and apply the transformation:

```typescript
export async function getClaudeSessionHistory(
  claudeSessionId: string,
  workingDir: string,
  transcriptsRoot = defaultTranscriptsRoot,
  command?: string,
  customPrompt?: string
): Promise<ClaudeTranscriptHistory> {
  // ... existing file read code unchanged ...

  // The existing local variable is named `entries` — rename to `rawEntries`
  // to distinguish before/after the label substitution:
  const rawEntries = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as TranscriptLine)
    .filter((line) => line.type === 'user' || line.type === 'assistant')
    .map((line) => ({
      role: line.message?.role ?? line.type ?? 'unknown',
      content: normalizeContent(line.message?.content),
      timestamp: line.timestamp,
    }))
    .filter((entry) => entry.content.length > 0);

  return {
    claudeSessionId,
    entries: replaceFirstUserMessage(rawEntries, command, customPrompt),
  };
}
```

Note: The existing local variable `entries` is renamed to `rawEntries` — this is intentional to make the transformation explicit.

- [ ] **Step 4: Run all history tests to verify they all pass**

```bash
cd backend && pnpm vitest run services/claude/claudeSessionHistory.test.ts
```

Expected: All tests (existing + new) PASS

- [ ] **Step 5: Update `getChatSessionHistory` in `chatSessions.ts` to pass command through**

In `backend/services/chatSessions.ts`, update `getChatSessionHistory`:

```typescript
export async function getChatSessionHistory(
  projectId: string,
  prNumber: number,
  sessionId: string
): Promise<ChatSessionHistoryResponse> {
  const workingDirectory = await projectRepository.findWorkingDirectoryById(projectId);
  if (!workingDirectory) {
    throw new AppError('Project not found', HttpStatus.NOT_FOUND);
  }

  const session = await getChatSession(projectId, prNumber, sessionId);
  const history = await getClaudeSessionHistory(
    session.claudeSessionId,
    workingDirectory,
    undefined,          // use default transcriptsRoot
    session.command,
    session.customPrompt
  );

  return ChatSessionHistoryResponseDto.of(session.id, history.claudeSessionId, history.entries);
}
```

- [ ] **Step 6: Build backend**

```bash
cd backend && pnpm build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add backend/services/claude/claudeSessionHistory.ts backend/services/claude/claudeSessionHistory.test.ts backend/services/chatSessions.ts
git commit -m "feat: replace first user message with command label in chat history at read-time"
```

---

## Task 6: Update frontend types and `execute()` signature

**Files:**
- Modify: `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/types.ts`
- Modify: `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useClaudeWebSocket.ts`

- [ ] **Step 1: Add new types to `types.ts`**

In `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/types.ts`, add `CommandContext` and `ClaudeCommand` to the **existing** `export type { ... } from '@lgtmai/backend/types'` block (not a new block):

```typescript
export type {
  WsClientMessage,
  WsServerMessage,
  WsExecuteMessage,
  WsAbortMessage,
  WsApprovalResponseMessage,
  WsPlanApprovalResponseMessage,
  WsTextEvent,
  WsToolMessageEvent,
  WsToolResultEvent,
  WsStderrEvent,
  WsDoneEvent,
  WsErrorEvent,
  WsApprovalRequestEvent,
  WsPlanApprovalRequestEvent,
  ClaudeExecuteOptions,
  ClaudeExecutionMode,
  CommandContext,
  ClaudeCommand,
} from '@lgtmai/backend/types';
```

Then add the new payload interfaces after the existing `ApprovalRequest` interface:

```typescript
export interface CommandPayload {
  command: ClaudeCommand;
  context: CommandContext;
  customPrompt?: string;
}

export interface FollowUpPayload {
  followUp: string;
}
```

- [ ] **Step 2: Update `execute()` in `useClaudeWebSocket.ts`**

In `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useClaudeWebSocket.ts`:

1. Add `CommandPayload` and `FollowUpPayload` to the import from `./types`:

```typescript
import type {
  ConnectionStatus,
  ClaudeMessage,
  ApprovalRequest,
  WsServerMessage,
  ClaudeExecuteOptions,
  CommandPayload,
  FollowUpPayload,
} from './types';
```

2. Update the `execute` type in `UseClaudeWebSocketReturn`:

```typescript
execute: (
  payload: CommandPayload | FollowUpPayload,
  workingDir: string,
  options?: ClaudeExecuteOptions
) => string;
```

3. Replace the `execute` implementation:

```typescript
const execute = (
  payload: CommandPayload | FollowUpPayload,
  workingDir: string,
  options?: ClaudeExecuteOptions
): string => {
  const requestId = crypto.randomUUID();

  if ('followUp' in payload) {
    // Follow-up: add to live UI and send as followUp shape
    addMessage({ type: 'user', content: payload.followUp });
    send({
      type: 'execute',
      requestId,
      followUp: payload.followUp,
      workingDir,
      options,
    });
  } else {
    // Command-based: caller (ReviewList) already called addUserMessage before execute()
    send({
      type: 'execute',
      requestId,
      command: payload.command,
      context: payload.context,
      ...(payload.customPrompt ? { customPrompt: payload.customPrompt } : {}),
      workingDir,
      options,
    });
  }

  return requestId;
};
```

- [ ] **Step 3: Build frontend (expect errors in call sites — that's expected)**

```bash
cd frontend && pnpm build
```

Expected: Type errors in `ReviewList.tsx`, `useChatPanelSync.ts` — fixed in Tasks 7–8.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/types.ts frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useClaudeWebSocket.ts
git commit -m "feat: update execute() to accept CommandPayload | FollowUpPayload"
```

---

## Task 7: Update `useChatPanelSync` follow-up handler

**Files:**
- Modify: `frontend/src/domains/PRDetail/hooks/useChatPanelSync.ts`

- [ ] **Step 1: Update the follow-up handler**

In `frontend/src/domains/PRDetail/hooks/useChatPanelSync.ts`, replace the `handleFollowUp` function:

```typescript
// Replace:
const handleFollowUp = (message: string) => {
  if (ws.sessionId) {
    ws.execute(message, workingDir, {
      executionMode: 'bypassPermissions',
      sessionId: ws.sessionId,
    });
  }
};

// With:
const handleFollowUp = (message: string) => {
  if (ws.sessionId) {
    ws.execute(
      { followUp: message },
      workingDir,
      {
        executionMode: 'bypassPermissions',
        sessionId: ws.sessionId,
      }
    );
  }
};
```

No `addUserMessage` call is needed here — `execute()` internally adds the user message for `FollowUpPayload`.

- [ ] **Step 2: Build frontend**

```bash
cd frontend && pnpm build
```

Expected: `useChatPanelSync.ts` compiles. Remaining type errors in `ReviewList.tsx` and `ActionSelector.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/domains/PRDetail/hooks/useChatPanelSync.ts
git commit -m "refactor: update follow-up handler to use FollowUpPayload"
```

---

## Task 8: Update `ReviewList` and `reviewPrompts.ts` (frontend)

**Files:**
- Modify: `frontend/src/domains/PRDetail/utils/reviewPrompts.ts`
- Modify: `frontend/src/domains/PRDetail/components/ReviewList/ReviewList.tsx`

- [ ] **Step 1: Slim down `reviewPrompts.ts`**

Replace the entire content of `frontend/src/domains/PRDetail/utils/reviewPrompts.ts` with:

```typescript
export const ACTION_LABELS: Record<string, string> = {
  validate: 'Validate this review',
  explain: 'Explain this review',
  fix: 'Fix code based on this review',
};
```

(Remove `buildPromptForAction`, `getExecutionMode`, `ReviewTarget` interface, and the `ClaudeExecutionMode` import.)

- [ ] **Step 2: Update `ReviewList.tsx` imports**

In `frontend/src/domains/PRDetail/components/ReviewList/ReviewList.tsx`:

Replace the import of `reviewPrompts`:

```typescript
// Remove:
import {
  buildPromptForAction,
  getExecutionMode,
  ACTION_LABELS,
} from '../../utils/reviewPrompts';

// Replace with:
import { ACTION_LABELS } from '../../utils/reviewPrompts';
import type { CommandContext } from '../../hooks/useClaudeWebSocket/types';
```

- [ ] **Step 3: Update `setOnExecuteAction` callback in `ReviewList.tsx`**

Find `setOnExecuteAction((actionId: string, customPrompt?: string) => {` and replace the body:

```typescript
setOnExecuteAction((actionId: string, customPrompt?: string) => {
  setValidations((prev) => ({
    ...prev,
    [target.id]: { status: 'validating' },
  }));

  const context: CommandContext = {
    type: target.type,   // already 'review' | 'comment' — no mapping needed
    author: target.author,
    body: target.body,
    ...(target.path ? { path: target.path } : {}),
    prNumber,
  };

  const userMessage = ACTION_LABELS[actionId] || customPrompt || actionId;
  addUserMessage(userMessage);

  setMode('chat');
  execute(
    {
      command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
      context,
      ...(customPrompt ? { customPrompt } : {}),
    },
    workingDir,
    { executionMode: 'bypassPermissions' }
  );
});
```

Note: `target.type` is already `'review' | 'comment'` (see `ValidationTarget` interface in `ReviewList.tsx` lines 23–29). No mapping needed — use `target.type` directly.

- [ ] **Step 4: Build frontend**

```bash
cd frontend && pnpm build
```

Expected: Only `ActionSelector.tsx` error remains.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/domains/PRDetail/utils/reviewPrompts.ts frontend/src/domains/PRDetail/components/ReviewList/ReviewList.tsx
git commit -m "refactor: remove prompt assembly from frontend, build CommandContext in ReviewList"
```

---

## Task 9: Update `ActionSelector` — rename 'chat' to 'custom'

**Files:**
- Modify: `frontend/src/domains/PRDetail/components/ChatPanel/ActionSelector.tsx`

- [ ] **Step 1: Rename all occurrences of `'chat'` action ID to `'custom'`**

In `frontend/src/domains/PRDetail/components/ChatPanel/ActionSelector.tsx`, replace all occurrences of `onSelect('chat',` with `onSelect('custom',`:

There are two occurrences:
- In `handleChatSubmit`: `onSelect('chat', chatInput.trim())`
- In `onKeyDown`: `onSelect('chat', chatInput.trim())`

Both become: `onSelect('custom', chatInput.trim())`

- [ ] **Step 2: Build entire project**

```bash
pnpm run build
```

(Run from the monorepo root.)

Expected: All workspaces build successfully with no type errors.

- [ ] **Step 3: Run all backend tests**

```bash
cd backend && pnpm vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/domains/PRDetail/components/ChatPanel/ActionSelector.tsx
git commit -m "refactor: rename 'chat' action ID to 'custom' in ActionSelector"
```

---

## Task 10: Smoke test end-to-end

**No new files.**

Manually verify the full flow works.

- [ ] **Step 1: Start dev servers**

```bash
pnpm run dev
```

- [ ] **Step 2: Test Validate action**
  1. Open a PR in the UI
  2. Click on a review comment → chat panel opens
  3. Click "Validate" → chat panel switches to chat mode
  4. Verify Claude responds
  5. Open chat history for that session → first message shows "Validate this review" (not raw prompt)

- [ ] **Step 3: Test custom prompt**
  1. Open a review comment
  2. Type a custom message and press Send
  3. Verify Claude responds with context about the review
  4. Open chat history → first message shows the custom text

- [ ] **Step 4: Test follow-up**
  1. After a Validate session, type a follow-up question
  2. Verify Claude responds in the same session context

- [ ] **Step 5: Test Fix action**
  1. Click "Fix Code" on a review
  2. Verify Claude executes and applies changes (bypassPermissions — no approval prompt)

- [ ] **Step 6: Commit any fixes found during smoke test**

```bash
git add -p
git commit -m "fix: address smoke test issues"
```

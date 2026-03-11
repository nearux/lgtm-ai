# PR Chat Session Metadata Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Claude Code session metadata for PR review/comment chats and expose backend APIs to list saved sessions and fetch prior history on demand.

**Architecture:** Add a `ChatSession` persistence layer in Prisma, thread chat target context through the existing websocket execute flow, and introduce backend services/controllers for session listing and Claude-backed history retrieval. Reuse the current Claude `sessionId` and `--resume` primitives rather than storing transcripts.

**Tech Stack:** TypeScript, Express, TSOA, Prisma with SQLite, ws, zod, vitest-style existing test setup

---

## File Map

- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_chat_sessions/migration.sql`
- Modify: `backend/types/claude.ts`
- Modify: `backend/types/index.ts`
- Create: `backend/types/chatSessions.ts`
- Modify: `backend/controllers/ClaudeWSController.ts`
- Modify: `backend/services/claude/ClaudeSessionManager.ts`
- Create: `backend/services/chatSessions.ts`
- Create: `backend/services/claude/ClaudeHistoryService.ts`
- Modify: `backend/controllers/ProjectsController.ts`
- Modify: `backend/routes.ts`
- Modify: `backend/tsoa.json` if route generation settings require regeneration inputs
- Create: `backend/services/chatSessions.test.ts`
- Create: `backend/services/claude/ClaudeHistoryService.test.ts`

## Chunk 1: Persist Chat Session Metadata

### Task 1: Add the Prisma model

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_chat_sessions/migration.sql`

- [ ] **Step 1: Write the failing schema expectations**

Document the intended model shape in the migration and schema before touching services:

```prisma
enum ChatSessionScopeType {
  REVIEW
  COMMENT
}

model ChatSession {
  id                String   @id
  project_id        String
  pr_number         Int
  scope_type        ChatSessionScopeType
  scope_target_id   String
  claude_session_id String   @unique
  title             String?
  created_at        DateTime
  updated_at        DateTime
  last_used_at      DateTime
}
```

- [ ] **Step 2: Add the schema and migration**

Create the enum, model, and indexes:

```sql
CREATE TABLE "ChatSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "project_id" TEXT NOT NULL,
  "pr_number" INTEGER NOT NULL,
  "scope_type" TEXT NOT NULL,
  "scope_target_id" TEXT NOT NULL,
  "claude_session_id" TEXT NOT NULL,
  "title" TEXT,
  "created_at" DATETIME NOT NULL,
  "updated_at" DATETIME NOT NULL,
  "last_used_at" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ChatSession_claude_session_id_key"
  ON "ChatSession"("claude_session_id");
CREATE INDEX "ChatSession_project_id_pr_number_idx"
  ON "ChatSession"("project_id", "pr_number");
CREATE INDEX "ChatSession_project_id_pr_number_scope_type_scope_target_id_idx"
  ON "ChatSession"("project_id", "pr_number", "scope_type", "scope_target_id");
```

- [ ] **Step 3: Run Prisma generation/build verification**

Run: `pnpm --filter @lgtmai/backend build`  
Expected: backend compiles with the new Prisma model available.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat: add chat session persistence model"
```

Do not run this commit unless the user explicitly authorizes committing.

### Task 2: Add shared backend types for chat sessions

**Files:**
- Create: `backend/types/chatSessions.ts`
- Modify: `backend/types/index.ts`
- Modify: `backend/types/claude.ts`

- [ ] **Step 1: Write the target type definitions**

Add exact transport types for:

```ts
export type ChatSessionScopeType = 'REVIEW' | 'COMMENT';

export interface ChatSessionSummary {
  id: string;
  projectId: string;
  prNumber: number;
  scopeType: ChatSessionScopeType;
  scopeTargetId: string;
  claudeSessionId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string;
}
```

Add Claude websocket context types:

```ts
export interface ClaudeChatContext {
  projectId: string;
  prNumber: number;
  scopeType: 'REVIEW' | 'COMMENT';
  scopeTargetId: string;
  title?: string;
}
```

- [ ] **Step 2: Thread the new context into websocket execute types**

Update `WsExecuteMessage` and related execute options to accept backend-only context separately from Claude CLI options.

- [ ] **Step 3: Run targeted build**

Run: `pnpm --filter @lgtmai/backend build`  
Expected: type exports and websocket contracts compile cleanly.

- [ ] **Step 4: Commit**

```bash
git add backend/types/chatSessions.ts backend/types/index.ts backend/types/claude.ts
git commit -m "feat: add chat session transport types"
```

Do not run this commit unless the user explicitly authorizes committing.

## Chunk 2: Wire Persistence into Claude Websocket Execution

### Task 3: Add chat session service with tests

**Files:**
- Create: `backend/services/chatSessions.ts`
- Create: `backend/services/chatSessions.test.ts`

- [ ] **Step 1: Write the failing service tests**

Cover these cases with explicit tests:

```ts
it('creates a saved chat session from execution context and claude session id');
it('lists sessions for a project and PR sorted by last_used_at desc');
it('filters sessions by scope type and target id');
it('touches last_used_at when resuming a saved session');
it('throws not found when session does not belong to project/pr');
```

- [ ] **Step 2: Implement the minimal service**

Required functions:

```ts
createChatSessionFromExecution(context, claudeSessionId): Promise<ChatSessionSummary>
listChatSessions(projectId, prNumber, filters): Promise<ChatSessionSummary[]>
touchChatSession(id): Promise<void>
getChatSession(projectId, prNumber, sessionId): Promise<ChatSessionSummary>
```

- [ ] **Step 3: Run the focused tests**

Run: `pnpm --filter @lgtmai/backend test -- chatSessions`  
Expected: new service tests pass.

- [ ] **Step 4: Commit**

```bash
git add backend/services/chatSessions.ts backend/services/chatSessions.test.ts
git commit -m "feat: add chat session service"
```

Do not run this commit unless the user explicitly authorizes committing.

### Task 4: Persist new sessions and touch resumed sessions in websocket flow

**Files:**
- Modify: `backend/controllers/ClaudeWSController.ts`
- Modify: `backend/services/claude/ClaudeSessionManager.ts`
- Modify: `backend/types/claude.ts`
- Test: `backend/services/chatSessions.test.ts` or a new focused manager test if needed

- [ ] **Step 1: Write the failing behavior test**

Add coverage for:

```ts
it('persists a chat session when a new claude execution completes with session id');
it('does not persist when execute lacks chat context');
it('does not create a duplicate session row when resuming');
it('updates last_used_at when resuming an existing session');
```

- [ ] **Step 2: Implement the websocket orchestration**

Rules:

- `execute` accepts `chatContext?`
- if `options.sessionId` is absent and `done.sessionId` exists, create a row
- if `options.sessionId` is present and a saved row is being resumed, update `last_used_at`
- persistence failures should be logged and isolated from websocket completion delivery

- [ ] **Step 3: Run focused tests and build**

Run: `pnpm --filter @lgtmai/backend test -- ClaudeSessionManager`  
Run: `pnpm --filter @lgtmai/backend build`  
Expected: behavior passes and backend still compiles.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/ClaudeWSController.ts backend/services/claude/ClaudeSessionManager.ts backend/types/claude.ts
git commit -m "feat: persist chat sessions from claude websocket flow"
```

Do not run this commit unless the user explicitly authorizes committing.

## Chunk 3: Expose Session Listing and History APIs

### Task 5: Add Claude history adapter with tests

**Files:**
- Create: `backend/services/claude/ClaudeHistoryService.ts`
- Create: `backend/services/claude/ClaudeHistoryService.test.ts`

- [ ] **Step 1: Write the failing adapter tests**

Cover:

```ts
it('fetches history for a claude session id');
it('maps cli failures to service errors');
it('parses history into a stable API response shape');
```

- [ ] **Step 2: Implement the minimal adapter**

The adapter should:

- spawn `claude` with the appropriate session-history command for a known `claude_session_id`
- parse stdout into typed history entries
- avoid mixing this adapter with the streaming websocket execution path

If Claude CLI output is line-oriented JSON, parse it as JSON. If it is plain text, transform it into a response envelope and document the limitation in code comments or tests.

- [ ] **Step 3: Run focused tests**

Run: `pnpm --filter @lgtmai/backend test -- ClaudeHistoryService`  
Expected: adapter tests pass with mocked child process behavior.

- [ ] **Step 4: Commit**

```bash
git add backend/services/claude/ClaudeHistoryService.ts backend/services/claude/ClaudeHistoryService.test.ts
git commit -m "feat: add claude session history adapter"
```

Do not run this commit unless the user explicitly authorizes committing.

### Task 6: Add TSOA endpoints for session list and history

**Files:**
- Modify: `backend/controllers/ProjectsController.ts`
- Modify: `backend/routes.ts`
- Modify: `backend/types/chatSessions.ts`
- Modify: `backend/services/chatSessions.ts`

- [ ] **Step 1: Write the controller/service expectations**

Add DTOs for:

```ts
export interface ChatSessionHistoryResponse {
  sessionId: string;
  claudeSessionId: string;
  entries: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
}
```

Endpoints:

```ts
GET /api/projects/{projectId}/prs/{prNumber}/chat-sessions
GET /api/projects/{projectId}/prs/{prNumber}/chat-sessions/{sessionId}/history
```

- [ ] **Step 2: Implement controller and route generation flow**

Controller responsibilities:

- validate `projectId`
- validate query filter combinations
- delegate listing to `chatSessions` service
- delegate history fetch to `chatSessions` + `ClaudeHistoryService`

After changing controller annotations, regenerate routes if the repo expects generated `backend/routes.ts` to stay committed.

- [ ] **Step 3: Run backend verification**

Run: `pnpm --filter @lgtmai/backend build`  
Expected: generated routes and controller compile successfully.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/ProjectsController.ts backend/routes.ts backend/types/chatSessions.ts backend/services/chatSessions.ts
git commit -m "feat: add chat session list and history APIs"
```

Do not run this commit unless the user explicitly authorizes committing.

## Chunk 4: End-to-End Backend Verification

### Task 7: Run regression checks for backend behavior

**Files:**
- Test: `backend/services/chatSessions.test.ts`
- Test: `backend/services/claude/ClaudeHistoryService.test.ts`
- Test: existing backend tests impacted by type/controller changes

- [ ] **Step 1: Run the focused new tests**

Run: `pnpm --filter @lgtmai/backend test -- chatSessions`  
Run: `pnpm --filter @lgtmai/backend test -- ClaudeHistoryService`

Expected: both new suites pass.

- [ ] **Step 2: Run the broader backend test suite**

Run: `pnpm --filter @lgtmai/backend test`

Expected: no regressions in existing backend tests.

- [ ] **Step 3: Run the backend build**

Run: `pnpm --filter @lgtmai/backend build`

Expected: successful production build.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "test: verify chat session backend integration"
```

Do not run this commit unless the user explicitly authorizes committing.

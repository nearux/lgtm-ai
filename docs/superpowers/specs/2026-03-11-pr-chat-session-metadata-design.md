# PR Chat Session Metadata Design

**Date:** 2026-03-11

## Goal

Persist Claude Code session metadata for chats that belong to a specific PR review or PR comment, so the backend can:

- list all saved sessions for a PR or for a specific review/comment target
- resume an existing Claude Code session
- fetch prior chat history on demand from Claude Code using the saved Claude session ID

This change is backend-only. Frontend changes are explicitly out of scope.

## Current State

- Claude executions are managed in memory by `backend/services/claude/ClaudeSessionManager.ts`.
- The backend already receives `sessionId` from Claude Code on `done`.
- The backend already supports `--resume=<sessionId>` through `ClaudeExecuteOptions.sessionId`.
- No database model exists yet for PR chat sessions.
- Chat messages are not persisted, and that remains unchanged.

## Requirements

### Functional

- When a new Claude Code session is created for a PR review or PR comment, persist its metadata in the database.
- A saved session must always belong to:
  - one local `project_id`
  - one `pr_number`
  - one target type: `REVIEW` or `COMMENT`
  - one target identifier: the upstream review/comment ID
- Multiple sessions may exist for the same review or comment target.
- The backend must provide an API to list sessions for a PR.
- The backend must support filtering the list by target type and target ID.
- The backend must provide an API to fetch chat history for a saved session.
- Chat history must be fetched from Claude Code at read time using the saved Claude session ID.

### Non-Functional

- Do not persist full chat transcripts in the database.
- Keep the existing websocket execution flow compatible.
- Return clear errors when session lookup fails or Claude history retrieval fails.

## Recommended Approach

Use a single `chat_session` registry table plus on-demand history retrieval from Claude Code.

Why this approach:

- It matches the requirement to persist only session metadata.
- It reuses the existing `sessionId` and `--resume` flow already present in the backend.
- It avoids introducing transcript storage, synchronization, or cache invalidation concerns.

## Data Model

Add a `ChatSession` model to Prisma.

### Fields

- `id`: internal UUID
- `project_id`: local project ID
- `pr_number`: PR number
- `scope_type`: enum with `REVIEW | COMMENT`
- `scope_target_id`: upstream review ID or comment ID
- `claude_session_id`: Claude Code session ID
- `title`: optional display label
- `created_at`
- `updated_at`
- `last_used_at`

### Constraints and Indexes

- `claude_session_id` should be unique.
- Add lookup indexes for:
  - `(project_id, pr_number)`
  - `(project_id, pr_number, scope_type, scope_target_id)`

### Notes

- `pr_number` is stored directly instead of introducing a PR table, which keeps the change scoped to the existing schema style.
- The same review/comment target may have multiple sessions, so no uniqueness should be enforced on target fields.

## Backend Flow

### New Session

1. The client sends websocket `execute` without `options.sessionId`.
2. Claude runs a new session.
3. The backend receives `done.sessionId`.
4. If execution context includes chat target metadata and `sessionId` exists, persist a new `chat_session` row.

### Resume Existing Session

1. The caller provides an existing saved session.
2. The backend uses the saved `claude_session_id` as `options.sessionId`.
3. Claude resumes via `--resume`.
4. The backend updates `last_used_at`.

### Fetch Session History

1. The API looks up the saved `chat_session`.
2. The backend validates `project_id` and `pr_number`.
3. The backend calls Claude Code using the saved `claude_session_id`.
4. The backend transforms the returned history into an API response payload.

## API Design

### List Sessions

`GET /api/projects/{projectId}/prs/{prNumber}/chat-sessions`

Optional query parameters:

- `scopeType=REVIEW|COMMENT`
- `scopeTargetId=<id>`

Behavior:

- Without filters, return all saved sessions for the PR.
- With both filters, return only sessions for the target review/comment.

### Get Session History

`GET /api/projects/{projectId}/prs/{prNumber}/chat-sessions/{sessionId}/history`

Behavior:

- Look up the internal saved session by `sessionId`.
- Ensure it belongs to the requested project and PR.
- Fetch history from Claude Code using `claude_session_id`.

## Execution Context Contract

To persist metadata at websocket completion time, the backend needs chat target context alongside `execute`.

Add optional execution context fields for backend use:

- `projectId`
- `prNumber`
- `scopeType`
- `scopeTargetId`
- `title`

Rules:

- If context is missing, execution still works, but no session metadata is saved.
- If `options.sessionId` is present, treat the execution as resume rather than create.

Frontend work is out of scope, but the backend contract should support those fields now.

## Error Handling

- If Claude execution completes without a `sessionId`, skip persistence.
- If session metadata insert fails, surface an error in logs but do not corrupt the websocket lifecycle.
- If a listed or requested session does not belong to the given project/PR, return `404`.
- If Claude history retrieval fails, return a gateway/service error that clearly indicates the external lookup failed.
- If query filters are partially provided, validate and return `400` for invalid combinations.

## Testing Strategy

### Prisma / Repository / Service

- create session metadata from completed new session
- do not create metadata when `sessionId` is absent
- list sessions by PR
- filter sessions by `scopeType` and `scopeTargetId`
- update `last_used_at` for resumed sessions
- reject cross-project or cross-PR lookups

### Claude History Adapter

- given a Claude session ID, invoke the CLI adapter and parse history output
- surface CLI failure as a service-level error

### WebSocket Integration Boundary

- verify that execution completion with chat context persists a session
- verify that resumed execution does not create a duplicate session row

## Out of Scope

- Frontend session picker UI
- Frontend history viewer integration
- Transcript caching in the database
- PR-wide general chat sessions

## Risks

- Claude Code history retrieval CLI behavior may differ from the current streaming execution path and needs an adapter with isolated tests.
- Websocket persistence should not make active chat execution brittle; persistence failures must stay contained.

## Open Implementation Note

The backend already has the key primitives for this design:

- `done.sessionId` is available
- `--resume` is already wired

The main work is introducing durable metadata storage and a history retrieval adapter around Claude Code.

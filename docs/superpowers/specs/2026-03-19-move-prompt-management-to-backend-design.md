# Move Prompt Management to Backend — Design Spec

**Date:** 2026-03-19
**Issue:** #57

---

## Summary

Currently, prompts for Validate/Fix/Explain actions are assembled on the frontend and sent as full text over WebSocket. When users view chat history, the raw system prompt is exposed. This spec moves all prompt assembly to the backend and introduces a command-based API so only the command intent is sent from the client.

---

## Problem

- `frontend/src/domains/PRDetail/utils/reviewPrompts.ts` assembles the full LLM prompt on the client
- The assembled prompt is sent as `prompt: string` in the WebSocket `execute` message
- Claude stores the full prompt in its JSONL transcript
- When chat history is fetched, the raw system prompt is returned to the user verbatim

---

## Goals

1. Remove prompt construction from the frontend
2. Backend assembles prompts from a `command` + `context` payload
3. Chat history returns a human-readable command label instead of the raw prompt
4. Custom prompts are also wrapped by the backend with PR/review context

---

## Non-Goals

- Changing the underlying Claude execution pipeline (ClaudeSessionManager, ClaudeProcess)
- Changing the WebSocket transport mechanism
- Redesigning the chat history storage schema beyond adding `command` and `customPrompt` fields

---

## Design

### 1. WebSocket Message Structure

**Before:**
```typescript
{
  type: 'execute',
  requestId: string,
  prompt: string,           // full assembled prompt — REMOVED
  workingDir: string,
  options?: { executionMode, model, sessionId },
  chatContext?: ClaudeChatContext,
}
```

**After — two shapes, narrowed by key presence:**

```typescript
// Shape A: command-based (new session)
{
  type: 'execute',
  requestId: string,
  workingDir: string,
  command: 'validate' | 'fix' | 'explain' | 'custom',
  context: CommandContext,
  customPrompt?: string,    // required when command === 'custom'; error if absent or empty
  options?: { executionMode, model, sessionId },
  chatContext?: ClaudeChatContext,
}

// Shape B: follow-up (existing session continuation)
{
  type: 'execute',
  requestId: string,
  workingDir: string,
  followUp: string,
  options: { executionMode, model, sessionId: string },  // sessionId required
  chatContext?: ClaudeChatContext,
}
```

The backend controller narrows using key presence: `'followUp' in msg` → Shape B, otherwise Shape A.
This is a structural union (not a TypeScript discriminated union with a literal key). The controller uses `'followUp' in msg` for branching.

**`CommandContext` type:**
```typescript
interface CommandContext {
  type: 'review' | 'comment',
  author: string,
  body: string,
  path?: string,        // inline comment only
  prNumber: number,
}
```

**`executionMode`** remains determined by the frontend. All cases (including `fix`) use `bypassPermissions`. This is an intentional behavior change — previously `fix` used `acceptEdits` (requiring user approval for file edits). With this refactor, file edits are applied automatically without approval prompts.

Note: `ActionSelector.tsx` currently sends `'chat'` as the action ID for custom text input. This will be renamed to `'custom'` to match the new command union type.

---

### 2. Backend: Prompt Builder Service

New file: `backend/services/promptBuilder.ts`

```typescript
export function buildPrompt(
  command: 'validate' | 'fix' | 'explain' | 'custom',
  context: CommandContext,
  customPrompt?: string
): string
```

- `validate`, `explain`, `fix`: port existing logic from `frontend/src/domains/PRDetail/utils/reviewPrompts.ts`
- `custom`: wrap `customPrompt` with PR/review context preamble (author, body, path, prNumber) so Claude has full context. If `customPrompt` is absent or empty, the backend sends a WebSocket error event and does not execute.
- Validation: if `context.type === 'comment'` and `context.path` is absent, the backend sends a WebSocket error event (path is required for inline comments to provide meaningful context).

**`ClaudeWSController.ts` changes:**
- On receiving `WsExecuteMessage`: narrow by `'followUp' in msg`
  - Shape B (`followUp`): use `msg.followUp` directly as prompt
  - Shape A (`command`): call `buildPrompt(msg.command, msg.context, msg.customPrompt)` to assemble prompt
- Capture `command` (and `customPrompt` if applicable) from the incoming Shape A message and hold in closure scope
- On `done` event: call `createChatSessionFromExecution(chatContext, claudeSessionId, { command, customPrompt })`
- Pass assembled prompt to the existing Claude execution flow (no other changes to session management)

---

### 3. Chat Session: Command Metadata

**Session storage** (`backend/services/chatSessions.ts`):
- Add `command` and `customPrompt` fields to the chat session record when calling `createChatSessionFromExecution()`
- Values come from the WebSocket `execute` message captured in the controller closure

**Prisma schema** (`backend/prisma/schema.prisma`):
- Add `command String?` column to `ChatSession` model (nullable to support existing sessions)
- Add `customPrompt String?` column to `ChatSession` model
- Run `prisma migrate dev --name add-command-to-chat-session`

**Repository layer** (`backend/repositories/chatSessionRepository.ts`):
- Update `create()` to include `command` and `customPrompt` in `Prisma.ChatSessionUncheckedCreateInput`

**Type / DTO layer** (`backend/types/chatSessions.ts`):
- Add `command?: string` and `customPrompt?: string` to both `ChatSessionSummary` type and `ChatSessionSummaryDto`

**History response** (`backend/services/claude/claudeSessionHistory.ts`):
- **Read-time transformation**: update `getClaudeSessionHistory` signature to accept `command?: string` and `customPrompt?: string` parameters
- The caller `getChatSessionHistory` in `chatSessions.ts` passes `session.command` and `session.customPrompt` through
- When building history, identify the first entry where `line.type === 'user'` and replace its `content` with the command label:
  - `validate` → `"Validate this review"`
  - `explain` → `"Explain this review"`
  - `fix` → `"Fix code based on this review"`
  - `custom` → the stored `customPrompt` text
  - `undefined` / unrecognized → leave unchanged (backwards compatibility)
- The JSONL transcript file is never modified; this is purely a read-time transform

---

### 4. Frontend Changes

**Remove from `reviewPrompts.ts`:**
- `buildPromptForAction()`
- `getExecutionMode()`
- `ACTION_LABELS` can stay (used for UI display)

**`useClaudeWebSocket` — `execute()` signature change:**
```typescript
// New signature (two overloads handled internally)
execute(
  payload: CommandPayload | FollowUpPayload,
  workingDir: string,
  options?: ClaudeExecuteOptions
): void

type CommandPayload = { command: ClaudeCommand; context: CommandContext; customPrompt?: string }
type FollowUpPayload = { followUp: string }
```

Live UI message responsibility:
- `CommandPayload`: the hook does NOT auto-add a user message; `ReviewList.handleOpenChat()` explicitly calls `addUserMessage()` before `execute()` (no change from current behavior)
- `FollowUpPayload`: the hook auto-adds the follow-up text as a user message (mirrors current behavior where `options?.sessionId` triggers `addMessage({ type: 'user', content: prompt })`)

**`useChatPanelSync.ts` — follow-up handler:**
- Change `ws.execute(message, workingDir, { ... })` to:
  `ws.execute({ followUp: message }, workingDir, { executionMode: 'bypassPermissions', sessionId: ws.sessionId })`
- No `addUserMessage` call needed here — the hook handles it internally for `FollowUpPayload`

**`ReviewList.tsx` — `handleOpenChat()`:**
- Remove `buildPromptForAction()` and `getExecutionMode()` calls
- Construct `context: CommandContext` from `target` (type, author, body, path) and `prNumber` prop
- Call `addUserMessage(ACTION_LABELS[actionId] || customPrompt || actionId)` before execute (no change to display logic)
- Call `execute({ command: actionId, context, customPrompt }, workingDir, { executionMode: 'bypassPermissions' })`

**`ActionSelector.tsx`:**
- Rename `'chat'` action ID to `'custom'` in `handleChatSubmit` and `onKeyDown` handler
- No other changes needed

**`executionMode`:** hardcode `bypassPermissions` for all cases

---

## Data Flow (After)

```
User clicks "Validate" on review
    ↓
ReviewList.handleOpenChat() builds CommandContext (no prompt)
addUserMessage("Validate this review") — live UI display
    ↓
ws.execute({ command: 'validate', context }, workingDir, { executionMode: 'bypassPermissions' })
    ↓
WebSocket sends: { type: 'execute', command: 'validate', context, workingDir, options, chatContext }
    ↓
Backend ClaudeWSController: 'followUp' not in msg → command path
Controller captures command='validate' in closure scope
    ↓
promptBuilder.buildPrompt('validate', context) → assembled prompt string
    ↓
ClaudeSessionManager.execute(assembledPrompt, workingDir, options)
    ↓
[existing Claude execution pipeline unchanged]
    ↓
On 'done': createChatSessionFromExecution(chatContext, claudeSessionId, { command: 'validate', customPrompt: undefined })
    ↓
History fetch:
  - getChatSessionHistory fetches session.command = 'validate'
  - passes command to getClaudeSessionHistory
  - first user message content replaced with "Validate this review" at read-time

---

User sends follow-up message "What about the second issue?"
    ↓
useChatPanelSync.handleFollowUp: ws.execute({ followUp: message }, workingDir, { executionMode: 'bypassPermissions', sessionId })
    ↓
WebSocket sends: { type: 'execute', followUp: '...', workingDir, options: { sessionId } }
    ↓
Backend ClaudeWSController: 'followUp' in msg → use followUp directly as prompt
    ↓
ClaudeSessionManager.execute(followUp, workingDir, options)
```

---

## Affected Files

### Backend
- `backend/services/promptBuilder.ts` — **new file**
- `backend/controllers/ClaudeWSController.ts` — narrow by followUp/command, call promptBuilder, capture command in closure
- `backend/services/chatSessions.ts` — add command + customPrompt to session creation and pass to history builder
- `backend/services/claude/claudeSessionHistory.ts` — add command/customPrompt params; read-time label substitution for first user message
- `backend/types/claude.ts` — update `WsExecuteMessage` to two-shape structural union; add `CommandContext` type
- `backend/types/chatSessions.ts` — add `command?: string` and `customPrompt?: string` to `ChatSessionSummary` type and DTO
- `backend/prisma/schema.prisma` — add `command String?` and `customPrompt String?` to `ChatSession` model
- `backend/repositories/chatSessionRepository.ts` — include `command` and `customPrompt` in create input

### Frontend
- `frontend/src/domains/PRDetail/utils/reviewPrompts.ts` — remove `buildPromptForAction`, `getExecutionMode`
- `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useClaudeWebSocket.ts` — update `execute()` to accept `CommandPayload | FollowUpPayload`
- `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/types.ts` — update message types; add `CommandPayload`, `FollowUpPayload`, `CommandContext`
- `frontend/src/domains/PRDetail/hooks/useChatPanelSync.ts` — update follow-up handler to use `FollowUpPayload`
- `frontend/src/domains/PRDetail/components/ReviewList/ReviewList.tsx` — update `handleOpenChat()` to build `CommandContext`, remove prompt assembly
- `frontend/src/domains/PRDetail/components/ChatPanel/ActionSelector.tsx` — rename `'chat'` → `'custom'` action ID

---

## Testing Considerations

- Verify `promptBuilder.buildPrompt()` produces identical output to old frontend `buildPromptForAction()` for validate, explain, fix
- Verify chat history no longer exposes raw prompts for new sessions
- Verify custom prompt is correctly wrapped with context; verify WebSocket error returned when customPrompt is empty
- Verify follow-up messages continue to work with existing sessions
- Verify `command` and `customPrompt` metadata are stored in DB and returned with history responses
- Verify history label substitution is a read-time transform (JSONL file unchanged)
- Verify existing sessions without `command` field return history unchanged (backwards compatibility)

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
- Redesigning the chat history storage schema beyond adding a `command` field

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
  options?: { executionMode, model, sessionId }
}
```

**After:**
```typescript
{
  type: 'execute',
  requestId: string,
  workingDir: string,
  command: 'validate' | 'fix' | 'explain' | 'custom',
  context: {
    type: 'review' | 'comment',
    author: string,
    body: string,
    path?: string,        // inline comment only
    prNumber: number,
  },
  customPrompt?: string,  // only when command === 'custom'
  options?: { executionMode, model, sessionId }
}
```

`executionMode` remains determined by the frontend. For now, all cases use `bypassPermissions`.

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
- `custom`: wrap `customPrompt` with PR/review context preamble so Claude has full context

**`ClaudeWSController.ts` changes:**
- Receive `command` + `context` instead of `prompt`
- Call `buildPrompt()` to assemble the prompt
- Pass assembled prompt to the existing Claude execution flow (no other changes)

---

### 3. Chat Session: Command Metadata

**Session storage** (`backend/services/chatSessions.ts`):
- Add `command` field to the chat session record when calling `createChatSessionFromExecution()`
- The command value comes from the WebSocket `execute` message

**DB schema addition:**
- `ChatSession` table: add `command: string` column

**History response** (`backend/services/claude/claudeSessionHistory.ts`):
- When building history, replace the first user message content with the command label
- Command labels: `validate` → `"Validate this review"`, `explain` → `"Explain this review"`, `fix` → `"Fix code based on this review"`, `custom` → the original `customPrompt` text

---

### 4. Frontend Changes

**Remove:**
- `buildPromptForAction()` from `reviewPrompts.ts`
- `getExecutionMode()` from `reviewPrompts.ts`
- `ACTION_LABELS` can stay (used for UI display)

**Change:**
- `useClaudeWebSocket` — `execute()` signature: `prompt: string` → `{ command, context, customPrompt? }`
- `ReviewList.tsx` — `handleOpenChat()`: construct `context` object instead of calling `buildPromptForAction()`
- `ActionSelector.tsx` — pass `command` ID and `customPrompt` directly (no prompt assembly)
- `executionMode`: hardcode `bypassPermissions` for all cases (remove `getExecutionMode()` call)

---

## Data Flow (After)

```
User clicks "Validate" on review
    ↓
ReviewList.handleOpenChat() builds context object (no prompt)
    ↓
execute({ command: 'validate', context, options: { executionMode: 'bypassPermissions' } })
    ↓
WebSocket sends: { type: 'execute', command, context, workingDir, options }
    ↓
Backend ClaudeWSController receives message
    ↓
promptBuilder.buildPrompt('validate', context) → assembled prompt string
    ↓
ClaudeSessionManager.execute(assembledPrompt, workingDir, options)
    ↓
[existing Claude execution pipeline unchanged]
    ↓
On 'done': createChatSessionFromExecution(context, claudeSessionId, command: 'validate')
    ↓
History fetch: first user message replaced with "Validate this review"
```

---

## Affected Files

### Backend
- `backend/services/promptBuilder.ts` — new file
- `backend/controllers/ClaudeWSController.ts` — receive command+context, call promptBuilder
- `backend/services/chatSessions.ts` — add command to session creation
- `backend/services/claude/claudeSessionHistory.ts` — replace first user message with label
- `backend/types/claude.ts` — add command/context types to execute message type
- DB migration — add `command` column to ChatSession table

### Frontend
- `frontend/src/domains/PRDetail/utils/reviewPrompts.ts` — remove buildPromptForAction, getExecutionMode
- `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useClaudeWebSocket.ts` — update execute() signature
- `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/types.ts` — update message types
- `frontend/src/domains/PRDetail/components/ReviewList/ReviewList.tsx` — update handleOpenChat()
- `frontend/src/domains/PRDetail/components/ChatPanel/ActionSelector.tsx` — pass command directly

---

## Testing Considerations

- Validate that `promptBuilder.buildPrompt()` produces identical output to the old frontend `buildPromptForAction()` for all three commands
- Verify chat history no longer exposes raw prompts
- Verify custom prompt is correctly wrapped with context
- Verify `command` metadata is stored and returned with history

# Frontend Refactoring Design

**Issue:** #95
**Branch:** `95-refactor-frontend` (based on `develop`)

## Summary

Improve consistency and maintainability across the frontend codebase by unifying query key conventions, standardizing API module naming, splitting the WebSocket hook, and simplifying ChatPanel state management.

## 1. Unify Query Key Conventions

**Current state:** 5 domains with inconsistent query key patterns — some missing `all` root keys, some accepting parameters in `all`, inconsistent prefix naming.

**Target convention:** TanStack Query hierarchical key factory pattern with intermediate grouping keys.

```ts
// Every domain follows this structure:
export const exampleQueryKey = {
  all: ['example'] as const,
  lists: () => [...exampleQueryKey.all, 'list'] as const,
  list: (params: Params) => [...exampleQueryKey.lists(), params] as const,
  details: () => [...exampleQueryKey.all, 'detail'] as const,
  detail: (id: string) => [...exampleQueryKey.details(), id] as const,
};
```

**Changes per domain:**

- **`auth`** — Add `all` root key, rename `githubStatus` to fit hierarchy
- **`prs`** — Add parameterless `all` root key (`['prs']`), add `lists()` and `details()` intermediate keys, remove `['projects', ...]` prefix (keep domain-scoped)
- **`projects`** — Add `details()` intermediate key
- **`fs`** — Add `browses()` intermediate key (or rename `browse` to `detail`)
- **`chatSessions`** — Add `lists()` and `histories()` intermediate keys

**Impact:** Update all `queryClient.invalidateQueries` and `useQuery` call sites referencing old keys.

## 2. Standardize API Module Naming

**Current state:**
- `auth/` uses plural naming: `queries.ts`, `mutations.ts`
- `git/` uses plural naming: `mutations.ts`
- Others use singular: `query.ts`, `mutation.ts`
- `auth/` and `git/` missing `index.ts` barrel exports

**Target:**
- All modules use **singular** naming: `query.ts`, `mutation.ts`, `queryKey.ts`
- All modules have `index.ts` barrel exports
- Main `shared/apis/index.ts` re-exports all modules

**Changes:**
- Rename `auth/queries.ts` → `auth/query.ts`
- Rename `auth/mutations.ts` → `auth/mutation.ts`
- Rename `git/mutations.ts` → `git/mutation.ts`
- Create `auth/index.ts` and `git/index.ts`
- Update `shared/apis/index.ts` to export auth and git

## 3. Split WebSocket Hook

**Current state:** `useClaudeWebSocket` (268 lines) manages connection lifecycle, message handling, file changes, and approval flow in one hook.

**Target:** Split into focused hooks composed by `useClaudeWebSocket`:

- **`useWebSocketConnection`** — Connection lifecycle (connect, disconnect, reconnect, status)
- **`useWebSocketMessages`** — Message array, addUserMessage, clearMessages, loadHistoryMessages
- **`useWebSocketApprovals`** — Approval request state and respondToApproval

**`useClaudeWebSocket`** becomes a thin composition layer:
```ts
export function useClaudeWebSocket() {
  const connection = useWebSocketConnection();
  const messages = useWebSocketMessages();
  const approvals = useWebSocketApprovals();

  const execute = (...) => { /* coordinates all three */ };

  return { ...connection, ...messages, ...approvals, execute };
}
```

The `execute` function and `handleMessage` dispatcher stay in the top-level hook since they coordinate across all sub-hooks. The message type switch dispatches to the appropriate sub-hook handler.

## 4. Simplify ChatPanel State Management

**Current state:** `ChatPanelContext` holds 16 fields + 16 individual setters. `useChatPanelSync` has 8 `useEffect` blocks to copy WebSocket state into Context. Callbacks (`onExecuteAction`, `onResumeSession`, `onSendFollowUp`) are stored in Context state.

**Target architecture:**

### 4a. Remove WebSocket-derived state from Context

Fields to remove from `ChatPanelContext`: `messages`, `status`, `sessionId`, `fileChanges`, `onSendFollowUp`, `clearMessages`.

These are consumed directly from `useClaudeWebSocket` where needed, not copied via sync effects. This eliminates most of `useChatPanelSync`.

### 4b. Context retains only UI orchestration state

Remaining fields:
- `title` — Panel title
- `mode` — 'action-selection' | 'chat' | 'history'
- `targetContext` — What the user clicked on (review, comment, PR)
- `prContext` — Current project/PR identifiers
- `claudeSessionId` — For session resumption
- `isResumedSession` — Flag for resumed sessions

### 4c. Replace callback storage with direct composition

Instead of storing `onExecuteAction` / `onResumeSession` in Context, the component that needs them (`ActionSelector`, `ChatHistoryList`) receives them as props from the parent that has access to both Context and WebSocket state.

### 4d. Resulting hook structure

- **`useChatPanelParams`** — Unchanged (URL params management)
- **`useChatPanelController`** — Simplified (no sync needed, just UI state + URL coordination)
- **`useChatPanelSync`** — Removed or reduced to a minimal bridge (only `claudeSessionId` sync)
- **`usePRChat`** — Simplified (directly calls WebSocket, no callback storage)

## Testing Strategy

- Run existing tests (`pnpm --filter @lgtmai/frontend test`) after each change group
- Run `pnpm --filter @lgtmai/frontend build` to verify TypeScript compilation
- Manual verification of chat panel flow (open, execute action, follow-up, resume session)

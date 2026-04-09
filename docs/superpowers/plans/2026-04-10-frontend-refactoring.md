# Frontend Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify query key conventions, standardize API module naming, split the WebSocket hook, and simplify ChatPanel state management.

**Architecture:** Four independent refactoring tasks that can be done sequentially. Each task produces a buildable, testable codebase. Tasks 1-2 are mechanical renames. Tasks 3-4 are structural refactors.

**Tech Stack:** React 19, TanStack React Query, TypeScript, Vite, Vitest

---

### Task 1: Unify Query Key Conventions

**Files:**
- Modify: `frontend/src/shared/apis/auth/queryKey.ts`
- Modify: `frontend/src/shared/apis/prs/queryKey.ts`
- Modify: `frontend/src/shared/apis/projects/queryKey.ts`
- Modify: `frontend/src/shared/apis/fs/queryKey.ts`
- Modify: `frontend/src/shared/apis/chatSessions/queryKey.ts`
- Modify: `frontend/src/shared/apis/prs/query.ts` (update key references)
- Modify: `frontend/src/shared/apis/projects/query.ts` (update key references)
- Modify: `frontend/src/domains/PRDetail/hooks/useChatPanelSync.ts` (update key references)
- Modify: `frontend/src/domains/PRDetail/components/ActivityTimeline/hooks/useActivityChat.tsx` (update key references)

- [ ] **Step 1: Update `authQueryKey`**

Add `all` root key and hierarchical structure:

```ts
// frontend/src/shared/apis/auth/queryKey.ts
export const authQueryKey = {
  all: ['auth'] as const,
  githubStatuses: () => [...authQueryKey.all, 'githubStatus'] as const,
  githubStatus: () => [...authQueryKey.githubStatuses()] as const,
};
```

Update the reference in `frontend/src/shared/apis/auth/queries.ts`:

```ts
// Change line 9 from:
queryKey: authQueryKey.githubStatus,
// To:
queryKey: authQueryKey.githubStatus(),
```

- [ ] **Step 2: Update `projectsQueryKey`**

```ts
// frontend/src/shared/apis/projects/queryKey.ts
export const projectsQueryKey = {
  all: ['projects'] as const,
  lists: () => [...projectsQueryKey.all, 'list'] as const,
  list: () => [...projectsQueryKey.lists()] as const,
  details: () => [...projectsQueryKey.all, 'detail'] as const,
  detail: (id: string) => [...projectsQueryKey.details(), id] as const,
};
```

Update `frontend/src/shared/apis/projects/query.ts`:

```ts
// Line 9: change projectsQueryKey.all → projectsQueryKey.list()
queryKey: projectsQueryKey.list(),

// Line 15: no change needed, projectsQueryKey.detail(id) signature is the same
```

Update `frontend/src/domains/PRDetail/components/ActivityTimeline/hooks/useActivityChat.tsx` line 140:

```ts
// Change from:
queryKey: projectsQueryKey.detail(projectId),
// To (no change needed — same signature):
queryKey: projectsQueryKey.detail(projectId),
```

- [ ] **Step 3: Update `prsQueryKey`**

```ts
// frontend/src/shared/apis/prs/queryKey.ts
import type { PRState } from '@lgtmai/backend/types';

export const prsQueryKey = {
  all: ['prs'] as const,
  lists: () => [...prsQueryKey.all, 'list'] as const,
  list: (
    projectId: string,
    params?: { state: PRState; page: number; limit: number; origin?: string }
  ) => [...prsQueryKey.lists(), projectId, params ?? {}] as const,
  details: () => [...prsQueryKey.all, 'detail'] as const,
  detail: (projectId: string, prNumber: number, origin?: string) =>
    [
      ...prsQueryKey.details(),
      projectId,
      prNumber,
      ...(origin ? [origin] : []),
    ] as const,
};
```

Update `frontend/src/shared/apis/prs/query.ts`:

```ts
// Line 17: change prsQueryKey.all(projectId, params) → prsQueryKey.list(projectId, params)
queryKey: prsQueryKey.list(projectId, params),

// Line 33: no change — prsQueryKey.detail() signature is the same
```

- [ ] **Step 4: Update `fsQueryKey`**

```ts
// frontend/src/shared/apis/fs/queryKey.ts
export const fsQueryKey = {
  all: ['fs'] as const,
  browses: () => [...fsQueryKey.all, 'browse'] as const,
  browse: (path?: string) => [...fsQueryKey.browses(), path] as const,
};
```

No changes needed in `frontend/src/shared/apis/fs/query.ts` — `fsQueryKey.browse(path)` signature is unchanged.

- [ ] **Step 5: Update `chatSessionsQueryKey`**

```ts
// frontend/src/shared/apis/chatSessions/queryKey.ts
export const chatSessionsQueryKey = {
  all: ['chatSessions'] as const,
  lists: () => [...chatSessionsQueryKey.all, 'list'] as const,
  list: (projectId: string, prNumber: number) =>
    [...chatSessionsQueryKey.lists(), projectId, prNumber] as const,
  histories: () => [...chatSessionsQueryKey.all, 'history'] as const,
  history: (projectId: string, prNumber: number, sessionId: string) =>
    [...chatSessionsQueryKey.histories(), projectId, prNumber, sessionId] as const,
};
```

No changes needed in consumers — `chatSessionsQueryKey.list()` and `chatSessionsQueryKey.history()` signatures are unchanged.

- [ ] **Step 6: Verify build and tests pass**

Run:
```bash
pnpm --filter frontend build && pnpm --filter frontend test
```

Expected: Build succeeds and all 44 tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/shared/apis/*/queryKey.ts frontend/src/shared/apis/auth/queries.ts frontend/src/shared/apis/prs/query.ts frontend/src/shared/apis/projects/query.ts
git commit -m "refactor: unify query key conventions to hierarchical factory pattern"
```

---

### Task 2: Standardize API Module Naming

**Files:**
- Rename: `frontend/src/shared/apis/auth/queries.ts` → `frontend/src/shared/apis/auth/query.ts`
- Rename: `frontend/src/shared/apis/auth/mutations.ts` → `frontend/src/shared/apis/auth/mutation.ts`
- Rename: `frontend/src/shared/apis/git/mutations.ts` → `frontend/src/shared/apis/git/mutation.ts`
- Create: `frontend/src/shared/apis/auth/index.ts`
- Modify: `frontend/src/shared/apis/git/index.ts`
- Modify: `frontend/src/shared/apis/index.ts`
- Modify: `frontend/src/shared/components/AccountMenu/AccountMenu.tsx` (update import path)

- [ ] **Step 1: Rename auth files and create barrel export**

```bash
cd frontend/src/shared/apis/auth
git mv queries.ts query.ts
git mv mutations.ts mutation.ts
```

Create `frontend/src/shared/apis/auth/index.ts`:

```ts
export { authQueryKey } from './queryKey';
export { authQuery } from './query';
export { authMutation } from './mutation';
```

- [ ] **Step 2: Rename git mutation file and update barrel**

```bash
cd frontend/src/shared/apis/git
git mv mutations.ts mutation.ts
```

Update `frontend/src/shared/apis/git/index.ts`:

```ts
export { gitMutation } from './mutation';
```

- [ ] **Step 3: Update main barrel export**

```ts
// frontend/src/shared/apis/index.ts
export { ApiClientError } from './client';
export { projectsQuery, projectsMutation, projectsQueryKey } from './projects';
export { prsQuery, prsMutation, prsQueryKey } from './prs';
export { fsQuery, fsQueryKey } from './fs';
export { chatSessionsQuery, chatSessionsQueryKey } from './chatSessions';
export { gitMutation } from './git';
export { authQuery, authMutation, authQueryKey } from './auth';
```

- [ ] **Step 4: Update AccountMenu import**

In `frontend/src/shared/components/AccountMenu/AccountMenu.tsx`, change:

```ts
// From:
import { authQuery } from '@/shared/apis/auth/queries';
import { authMutation } from '@/shared/apis/auth/mutations';

// To:
import { authQuery, authMutation } from '@/shared/apis';
```

- [ ] **Step 5: Verify build and tests pass**

Run:
```bash
pnpm --filter frontend build && pnpm --filter frontend test
```

Expected: Build succeeds and all 44 tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/shared/apis/
git add frontend/src/shared/components/AccountMenu/AccountMenu.tsx
git commit -m "refactor: standardize API module naming to singular and add barrel exports"
```

---

### Task 3: Split WebSocket Hook

**Files:**
- Create: `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useWebSocketConnection.ts`
- Create: `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useWebSocketMessages.ts`
- Create: `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useWebSocketApprovals.ts`
- Modify: `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useClaudeWebSocket.ts`
- Modify: `frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/index.ts` (no public API changes)

- [ ] **Step 1: Create `useWebSocketConnection`**

```ts
// frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useWebSocketConnection.ts
import { useRef, useState, useCallback } from 'react';
import type { ConnectionStatus, WsServerMessage } from './types';

const WS_URL = `ws://${window.location.host}/api/claude/execute`;

export function useWebSocketConnection() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef<((event: MessageEvent) => void) | null>(null);

  const setOnMessage = useCallback((handler: (event: MessageEvent) => void) => {
    onMessageRef.current = handler;
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      onMessageRef.current?.(event);
    };

    ws.onclose = () => {
      setStatus('disconnected');
      wsRef.current = null;
    };

    ws.onerror = () => {
      setStatus('disconnected');
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const send = useCallback((message: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return { status, connect, disconnect, send, setOnMessage };
}
```

- [ ] **Step 2: Create `useWebSocketMessages`**

```ts
// frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useWebSocketMessages.ts
import { useState, useCallback } from 'react';
import type { ClaudeMessage, FileChangesData } from './types';

export function useWebSocketMessages() {
  const [messages, setMessages] = useState<ClaudeMessage[]>([]);
  const [fileChanges, setFileChanges] = useState<FileChangesData | null>(null);

  const addMessage = useCallback(
    (msg: Omit<ClaudeMessage, 'id' | 'timestamp'>) => {
      setMessages((prev) => [
        ...prev,
        {
          ...msg,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        },
      ]);
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setFileChanges(null);
  }, []);

  const addUserMessage = useCallback(
    (content: string) => {
      addMessage({ type: 'user', content });
    },
    [addMessage]
  );

  const loadHistoryMessages = useCallback((msgs: ClaudeMessage[]) => {
    setMessages(msgs);
  }, []);

  return {
    messages,
    fileChanges,
    setFileChanges,
    addMessage,
    clearMessages,
    addUserMessage,
    loadHistoryMessages,
  };
}
```

- [ ] **Step 3: Create `useWebSocketApprovals`**

```ts
// frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useWebSocketApprovals.ts
import { useState, useCallback } from 'react';
import type { ApprovalRequest } from './types';

export function useWebSocketApprovals(send: (message: unknown) => void) {
  const [pendingApproval, setPendingApproval] =
    useState<ApprovalRequest | null>(null);

  const setApproval = useCallback((approval: ApprovalRequest) => {
    setPendingApproval(approval);
  }, []);

  const respondToApproval = useCallback(
    (
      requestId: string,
      approvalRequestId: string,
      behavior: 'allow' | 'deny',
      message?: string
    ) => {
      send({
        type: 'approval_response',
        requestId,
        approvalRequestId,
        behavior,
        message,
      });
      setPendingApproval(null);
    },
    [send]
  );

  const respondToPlanApproval = useCallback(
    (
      requestId: string,
      approvalRequestId: string,
      behavior: 'allow' | 'deny',
      message?: string
    ) => {
      send({
        type: 'plan_approval_response',
        requestId,
        approvalRequestId,
        behavior,
        message,
      });
      setPendingApproval(null);
    },
    [send]
  );

  return { pendingApproval, setApproval, respondToApproval, respondToPlanApproval };
}
```

- [ ] **Step 4: Rewrite `useClaudeWebSocket` as composition layer**

```ts
// frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/useClaudeWebSocket.ts
import { useEffect, useCallback } from 'react';
import type {
  WsServerMessage,
  ClaudeExecuteOptions,
  CommandPayload,
  FollowUpPayload,
} from './types';
import type { ClaudeChatContext } from '@lgtmai/backend/types';
import { useWebSocketConnection } from './useWebSocketConnection';
import { useWebSocketMessages } from './useWebSocketMessages';
import { useWebSocketApprovals } from './useWebSocketApprovals';

export interface UseClaudeWebSocketReturn {
  status: import('./types').ConnectionStatus;
  messages: import('./types').ClaudeMessage[];
  fileChanges: import('./types').FileChangesData | null;
  pendingApproval: import('./types').ApprovalRequest | null;
  sessionId: string | null;
  connect: () => void;
  disconnect: () => void;
  execute: (
    payload: CommandPayload | FollowUpPayload,
    workingDir: string,
    options?: ClaudeExecuteOptions,
    chatContext?: ClaudeChatContext
  ) => string;
  abort: (requestId: string) => void;
  respondToApproval: (
    requestId: string,
    approvalRequestId: string,
    behavior: 'allow' | 'deny',
    message?: string
  ) => void;
  respondToPlanApproval: (
    requestId: string,
    approvalRequestId: string,
    behavior: 'allow' | 'deny',
    message?: string
  ) => void;
  clearMessages: () => void;
  addUserMessage: (content: string) => void;
  loadHistoryMessages: (msgs: import('./types').ClaudeMessage[]) => void;
}

export function useClaudeWebSocket(): UseClaudeWebSocketReturn {
  const { status, connect, disconnect, send, setOnMessage } =
    useWebSocketConnection();
  const {
    messages,
    fileChanges,
    setFileChanges,
    addMessage,
    clearMessages,
    addUserMessage,
    loadHistoryMessages,
  } = useWebSocketMessages();
  const { pendingApproval, setApproval, respondToApproval, respondToPlanApproval } =
    useWebSocketApprovals(send);

  const [sessionId, setSessionId] = useState<string | null>(null);

  // Wire up message handler
  useEffect(() => {
    setOnMessage((event: MessageEvent) => {
      const data = JSON.parse(event.data) as WsServerMessage;

      switch (data.type) {
        case 'text':
          addMessage({ type: 'text', content: data.chunk });
          break;
        case 'tool_message':
          addMessage({
            type: 'tool',
            content: JSON.stringify(data.input, null, 2),
            toolName: data.toolName,
            toolId: data.toolId,
          });
          break;
        case 'tool_result':
          addMessage({
            type: 'tool_result',
            content: data.content,
            toolId: data.toolId,
            isError: data.isError,
          });
          break;
        case 'stderr':
          addMessage({ type: 'stderr', content: data.chunk });
          break;
        case 'error':
          addMessage({ type: 'error', content: data.message });
          break;
        case 'done':
          if (data.sessionId) {
            setSessionId(data.sessionId);
          }
          addMessage({ type: 'done', content: '' });
          break;
        case 'approval_request':
          setApproval({
            requestId: data.requestId,
            approvalRequestId: data.approvalRequestId,
            toolUseId: data.toolUseId,
            toolName: data.toolName,
            input: data.input,
            type: 'tool',
          });
          break;
        case 'plan_approval_request':
          setApproval({
            requestId: data.requestId,
            approvalRequestId: data.approvalRequestId,
            toolUseId: data.toolUseId,
            toolName: data.toolName,
            input: data.input,
            type: 'plan',
          });
          break;
        case 'file_changes':
          setFileChanges(data.changes);
          break;
      }
    });
  }, [addMessage, setApproval, setFileChanges, setOnMessage]);

  const execute = useCallback(
    (
      payload: CommandPayload | FollowUpPayload,
      workingDir: string,
      options?: ClaudeExecuteOptions,
      chatContext?: ClaudeChatContext
    ): string => {
      const requestId = crypto.randomUUID();

      if (payload.type === 'followUp') {
        addMessage({ type: 'user', content: payload.message });
        send({
          type: 'followUp',
          requestId,
          message: payload.message,
          workingDir,
          options,
        });
      } else {
        send({
          type: 'execute',
          requestId,
          command: payload.command,
          context: payload.context,
          ...(payload.customPrompt ? { customPrompt: payload.customPrompt } : {}),
          workingDir,
          options,
          chatContext,
        });
      }

      return requestId;
    },
    [addMessage, send]
  );

  const abort = useCallback(
    (requestId: string) => {
      send({ type: 'abort', requestId });
    },
    [send]
  );

  return {
    status,
    messages,
    fileChanges,
    pendingApproval,
    sessionId,
    connect,
    disconnect,
    execute,
    abort,
    respondToApproval,
    respondToPlanApproval,
    clearMessages,
    addUserMessage,
    loadHistoryMessages,
  };
}
```

Note: Add the missing `useState` import — the `import` line should be:

```ts
import { useEffect, useCallback, useState } from 'react';
```

- [ ] **Step 5: Update index.ts (no public API changes)**

`frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/index.ts` — no changes needed. The public exports remain the same since `UseClaudeWebSocketReturn` interface is unchanged.

- [ ] **Step 6: Verify build and tests pass**

Run:
```bash
pnpm --filter frontend build && pnpm --filter frontend test
```

Expected: Build succeeds and all 44 tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/domains/PRDetail/hooks/useClaudeWebSocket/
git commit -m "refactor: split useClaudeWebSocket into focused sub-hooks"
```

---

### Task 4: Simplify ChatPanel State Management

**Files:**
- Modify: `frontend/src/domains/PRDetail/contexts/ChatPanelContext.tsx`
- Modify: `frontend/src/domains/PRDetail/hooks/useChatPanelSync.ts`
- Modify: `frontend/src/domains/PRDetail/hooks/useChatPanelController.ts`
- Modify: `frontend/src/domains/PRDetail/hooks/usePRChat.ts`
- Modify: `frontend/src/domains/PRDetail/hooks/index.ts`
- Modify: `frontend/src/domains/PRDetail/page.tsx`
- Modify: `frontend/src/domains/PRDetail/components/ReviewList/ReviewList.tsx`
- Modify: `frontend/src/domains/PRDetail/components/CommentList/CommentList.tsx`
- Modify: `frontend/src/domains/PRDetail/components/PRDetailContent/PRDetailContent.tsx`

This is the largest task. The key change: remove WebSocket-derived state (`messages`, `status`, `sessionId`, `fileChanges`) and callback storage (`onSendFollowUp`, `clearMessages`, `onExecuteAction`, `onResumeSession`) from Context. Context keeps only UI orchestration state.

- [ ] **Step 1: Slim down `ChatPanelContext`**

Replace `frontend/src/domains/PRDetail/contexts/ChatPanelContext.tsx` with:

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ClaudeCommand, ChatSessionSummary } from '@lgtmai/backend/types';

export type ChatPanelMode = 'action-selection' | 'chat' | 'history';

export interface TargetContext {
  type: 'review' | 'inline' | 'pr';
  author: string;
  body: string;
  path?: string;
  prNumber: number;
}

export interface PRContext {
  projectId: string;
  prNumber: number;
}

export interface ChatPanelState {
  title: string;
  mode: ChatPanelMode;
  targetContext: TargetContext | null;
  prContext: PRContext | null;
  claudeSessionId: string | null;
  isResumedSession: boolean;
}

interface ChatPanelContextValue {
  state: ChatPanelState;
  setTitle: (title: string) => void;
  setMode: (mode: ChatPanelMode) => void;
  setTargetContext: (context: TargetContext | null) => void;
  setPRContext: (context: PRContext | null) => void;
  setClaudeSessionId: (claudeSessionId: string | null) => void;
  setIsResumedSession: (isResumed: boolean) => void;
}

const ChatPanelContext = createContext<ChatPanelContextValue | null>(null);

export const ChatPanelProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ChatPanelState>({
    title: 'Claude',
    mode: 'action-selection',
    targetContext: null,
    prContext: null,
    claudeSessionId: null,
    isResumedSession: false,
  });

  const setTitle = useCallback((title: string) => {
    setState((prev) => ({ ...prev, title }));
  }, []);

  const setMode = useCallback((mode: ChatPanelMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const setTargetContext = useCallback((targetContext: TargetContext | null) => {
    setState((prev) => ({ ...prev, targetContext }));
  }, []);

  const setPRContext = useCallback((prContext: PRContext | null) => {
    setState((prev) => ({ ...prev, prContext }));
  }, []);

  const setClaudeSessionId = useCallback((claudeSessionId: string | null) => {
    setState((prev) => ({ ...prev, claudeSessionId }));
  }, []);

  const setIsResumedSession = useCallback((isResumedSession: boolean) => {
    setState((prev) => ({ ...prev, isResumedSession }));
  }, []);

  return (
    <ChatPanelContext.Provider
      value={{
        state,
        setTitle,
        setMode,
        setTargetContext,
        setPRContext,
        setClaudeSessionId,
        setIsResumedSession,
      }}
    >
      {children}
    </ChatPanelContext.Provider>
  );
};

export const useChatPanel = () => {
  const context = useContext(ChatPanelContext);
  if (!context) {
    throw new Error('useChatPanel must be used within ChatPanelProvider');
  }
  return context;
};
```

- [ ] **Step 2: Rewrite `useChatPanelSync` to minimal bridge**

The only sync still needed: invalidate chat sessions query on `done`, and sync `claudeSessionId`.

```ts
// frontend/src/domains/PRDetail/hooks/useChatPanelSync.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatPanel } from '../contexts';
import { useClaudeWebSocket } from './useClaudeWebSocket';
import { chatSessionsQueryKey } from '@/shared/apis';

/**
 * Bridges WebSocket events to query cache and context.
 * Returns the WebSocket hook for direct consumption.
 */
export function useChatPanelSync(workingDir: string) {
  const { state, setClaudeSessionId } = useChatPanel();
  const ws = useClaudeWebSocket();
  const queryClient = useQueryClient();
  const prevDoneCountRef = useRef(0);

  // Invalidate chat sessions query when a chat completes
  useEffect(() => {
    const doneCount = ws.messages.filter((m) => m.type === 'done').length;

    if (doneCount > prevDoneCountRef.current && state.prContext) {
      queryClient.invalidateQueries({
        queryKey: chatSessionsQueryKey.list(
          state.prContext.projectId,
          state.prContext.prNumber
        ),
      });
    }

    prevDoneCountRef.current = doneCount;
  }, [ws.messages, state.prContext, queryClient]);

  // Sync sessionId to context for session resumption
  useEffect(() => {
    if (ws.sessionId) {
      setClaudeSessionId(ws.sessionId);
    }
  }, [ws.sessionId, setClaudeSessionId]);

  return ws;
}
```

- [ ] **Step 3: Simplify `useChatPanelController`**

Remove references to removed context fields:

```ts
// frontend/src/domains/PRDetail/hooks/useChatPanelController.ts
import { useEffect } from 'react';
import { useChatPanel } from '../contexts';
import { useChatPanelParams } from './useChatPanelParams';

/**
 * Combines URL params and context state for ChatPanel control.
 */
export function useChatPanelController() {
  const { state, setTitle } = useChatPanel();
  const { mode, isOpen, panelMode, goBack, closePanel, openHistory } =
    useChatPanelParams();

  // Sync title based on panelMode
  useEffect(() => {
    if (panelMode === 'history') {
      setTitle('Chat History');
    } else if (panelMode === 'action' && state.targetContext) {
      const t = state.targetContext;
      setTitle(
        t.type === 'pr'
          ? 'Chat: Pull Request'
          : t.type === 'review'
            ? `Chat: ${t.author}'s review`
            : `Chat: ${t.author}'s comment on ${t.path}`
      );
    }
  }, [panelMode, state.targetContext, setTitle]);

  return {
    state,
    mode,
    isOpen,
    onClose: closePanel,
    onShowHistory: openHistory,
    onHideHistory: goBack,
  };
}
```

Note: Removed `handleBackFromChat` (which called `state.clearMessages?.()`) — the caller now calls `ws.clearMessages()` directly.

- [ ] **Step 4: Simplify `usePRChat`**

Remove callback storage, directly use WebSocket and params:

```ts
// frontend/src/domains/PRDetail/hooks/usePRChat.ts
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatSessionsQuery } from '@/shared/apis';
import type {
  PRMeta,
  ClaudeChatContext,
  ChatSessionSummary,
} from '@lgtmai/backend/types';
import { useChatPanel } from '../contexts';
import { useChatPanelParams } from './useChatPanelParams';
import { useChatPanelSync } from './useChatPanelSync';
import type { ClaudeMessage } from './useClaudeWebSocket';
import { ACTION_LABELS } from '../utils/reviewPrompts';

interface UsePRChatOptions {
  projectId: string;
  prNumber: number;
  prMeta: PRMeta;
  prAuthor: string;
  prBody: string;
  workingDir: string;
}

export function usePRChat({
  projectId,
  prNumber,
  prMeta,
  prAuthor,
  prBody,
  workingDir,
}: UsePRChatOptions) {
  const { setTitle, setTargetContext, setPRContext, setClaudeSessionId } =
    useChatPanel();
  const { openActionSelector, openChat, resumeSession } = useChatPanelParams();
  const ws = useChatPanelSync(workingDir);

  // --- Session resume ---
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );
  const { data: historyData } = useQuery({
    ...chatSessionsQuery.history(projectId, prNumber, selectedSessionId ?? ''),
    enabled: !!selectedSessionId,
  });

  useEffect(() => {
    if (!historyData || !selectedSessionId) return;
    const msgs: ClaudeMessage[] = historyData.entries.map((e, i) => ({
      id: `history-${i}`,
      type: e.role === 'user' ? ('user' as const) : ('text' as const),
      content: e.content,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));
    ws.loadHistoryMessages(msgs);
    setClaudeSessionId(historyData.claudeSessionId);
    setSelectedSessionId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    historyData,
    selectedSessionId,
    ws.loadHistoryMessages,
    setClaudeSessionId,
  ]);

  // --- Public API ---
  const openPRChat = () => {
    if (ws.status !== 'connected') ws.connect();
    ws.clearMessages();

    setTargetContext({ type: 'pr', author: prAuthor, body: prBody, prNumber });
    setPRContext({ projectId, prNumber });
    openActionSelector('pr', `pr-${prNumber}`);
  };

  const executeAction = (actionId: string, customPrompt?: string) => {
    const label = ACTION_LABELS[actionId] || customPrompt || actionId;
    ws.addUserMessage(label);

    const chatContext: ClaudeChatContext = {
      projectId,
      prNumber,
      scopeType: 'REVIEW',
      scopeTargetId: '',
      title: label,
    };

    openChat();
    ws.execute(
      {
        type: 'command',
        command: actionId as 'validate' | 'fix' | 'explain' | 'custom',
        context: { type: 'review', author: prAuthor, body: prBody, prMeta },
        ...(customPrompt ? { customPrompt } : {}),
      },
      workingDir,
      { executionMode: 'bypassPermissions' },
      chatContext
    );
  };

  const resumeChatSession = (session: ChatSessionSummary) => {
    if (ws.status !== 'connected') ws.connect();
    setSelectedSessionId(session.id);
    setTitle(session.title || `Chat ${session.id.slice(0, 8)}`);
    const isPR = session.scopeType === 'REVIEW' && !session.scopeTargetId;
    resumeSession(
      isPR ? 'pr' : session.scopeType === 'REVIEW' ? 'review' : 'comment',
      session.scopeTargetId
    );
  };

  const sendFollowUp = (message: string) => {
    const sessionIdToUse = ws.sessionId;
    if (sessionIdToUse) {
      ws.execute({ type: 'followUp', message }, workingDir, {
        executionMode: 'bypassPermissions',
        sessionId: sessionIdToUse,
      });
    }
  };

  return {
    ws,
    openPRChat,
    executeAction,
    resumeChatSession,
    sendFollowUp,
  };
}
```

- [ ] **Step 5: Update `page.tsx` to use new API**

The page needs to pass WebSocket-derived state and callbacks down as props instead of reading them from Context:

```tsx
// frontend/src/domains/PRDetail/page.tsx
import { useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { AsyncBoundary } from '@/shared/components';
import { PRDetailContent } from './components/PRDetailContent/PRDetailContent';
import { ChatPanel } from './components/ChatPanel';
import { ChatPanelProvider } from './contexts';
import { useChatPanelController, useChatPanelParams } from './hooks';
import { useCommitAndPush } from './hooks/useCommitAndPush';

export const PRDetailPage = () => {
  return (
    <ChatPanelProvider>
      <PRDetailPageContent />
    </ChatPanelProvider>
  );
};

const PRDetailPageContent = () => {
  const { projectId, prNumber } = useParams<{
    projectId: string;
    prNumber: string;
  }>();
  const [searchParams] = useSearchParams();
  const origin = searchParams.get('origin') ?? undefined;
  const initialPanelRef = useRef(searchParams.get('panel'));

  const { closePanel } = useChatPanelParams();
  const chatPanel = useChatPanelController();
  const { commitState, handleCommitAndPush } = useCommitAndPush(projectId);

  // NOTE: Clear panel params on mount (page refresh)
  useEffect(() => {
    if (initialPanelRef.current) {
      closePanel();
      initialPanelRef.current = null;
    }
  }, [closePanel]);

  return (
    <div className="flex min-h-screen">
      <div
        className={`flex-1 transition-all duration-300 ${chatPanel.isOpen ? 'mr-[480px]' : ''}`}
      >
        <div className="mx-auto max-w-6xl p-8">
          <AsyncBoundary>
            <PRDetailContent
              projectId={projectId!}
              prNumber={prNumber!}
              origin={origin}
            />
          </AsyncBoundary>
        </div>
      </div>
      <ChatPanel
        {...chatPanel}
        onCommitAndPush={handleCommitAndPush}
        commitState={commitState}
      />
    </div>
  );
};
```

Note: `fileChanges` and `onCommitAndPush` conditional is removed from page — `ChatPanel` receives `onCommitAndPush` always and decides internally whether to show it based on WebSocket state. This requires `ChatPanel` to consume WebSocket state directly (via `useChatPanelSync` or `useClaudeWebSocket`). The exact `ChatPanel` changes depend on its current implementation — the engineer should read `ChatPanel.tsx` and wire `fileChanges` from the WebSocket hook it already has access to.

- [ ] **Step 6: Update hooks barrel export**

```ts
// frontend/src/domains/PRDetail/hooks/index.ts
export { useClaudeWebSocket } from './useClaudeWebSocket';
export { useChatPanelSync } from './useChatPanelSync';
export { useChatPanelParams } from './useChatPanelParams';
export { useChatPanelController } from './useChatPanelController';
export { usePRChat } from './usePRChat';
export type { PanelMode } from './useChatPanelParams';
export type {
  UseClaudeWebSocketReturn,
  ConnectionStatus,
  ClaudeMessage,
  ApprovalRequest,
  FileChangesData,
} from './useClaudeWebSocket';
```

- [ ] **Step 7: Update `ReviewList` and `CommentList`**

These components currently call `useChatPanel()` to read `onExecuteAction`, `onResumeSession`, etc. from Context. After the refactor, these callbacks come from `usePRChat` and must be passed as props.

The engineer should:
1. Read `ReviewList.tsx` and `CommentList.tsx` to identify which Context fields they use
2. Replace Context reads (`state.onExecuteAction`, `state.onResumeSession`, etc.) with props
3. Update `PRDetailContent.tsx` to pass the callbacks from `usePRChat` down

This step is intentionally left as a wiring exercise rather than prescriptive code, because `ReviewList.tsx` and `CommentList.tsx` are large components and the exact prop drilling pattern depends on what other fields they access.

- [ ] **Step 8: Verify build and tests pass**

Run:
```bash
pnpm --filter frontend build && pnpm --filter frontend test
```

Expected: Build succeeds and all 44 tests pass.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/domains/PRDetail/
git commit -m "refactor: simplify ChatPanel state by removing WebSocket state from Context"
```

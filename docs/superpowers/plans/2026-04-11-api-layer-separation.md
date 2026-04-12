# API Layer Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API 레이어(순수 HTTP + 타입)와 Query 레이어(TanStack Query options)를 분리하여 결합도를 낮추고, queryKey 파일을 제거하여 인라인 정의로 전환한다.

**Architecture:** `shared/apis/`에는 순수 HTTP 함수와 타입만 배치하고, `shared/queries/`에는 `queryOptions`/`mutationOptions` 함수만 배치한다. queryKey는 별도 파일 없이 queryOptions 내부에 인라인 정의한다. 타입은 API 레이어에서 관리하고, queryOptions의 반환 타입은 `queryFn`에서 자동 추론한다.

**Tech Stack:** React 19, TanStack React Query v5, TypeScript, Vite

---

## Design Decisions

### Naming Convention

**API 함수**: `verb + Domain + Action` 패턴의 개별 함수

```ts
// GET → getXxx
export const getProjectList = () => ...
export const getProjectDetail = (id: string) => ...

// POST/PATCH/DELETE → 액션 동사
export const createProject = (data: CreateProjectBody) => ...
export const updateProject = (id: string, data: UpdateProjectBody) => ...
export const deleteProject = (id: string) => ...
```

**Query Options**: `API함수명 + QueryOptions/MutationOptions`

```ts
export const getProjectListQueryOptions = () =>
  queryOptions({
    queryKey: ['projects', 'list'],
    queryFn: () => getProjectList(),
  });

export const createProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: createProject,
  });
```

### Type Management

- 타입은 API 레이어에서 import하고 필요시 re-export
- Query 레이어는 API 함수의 반환 타입에서 자동 추론 → 명시적 제네릭 불필요
- Mutation variables의 bridge 타입만 query 레이어에서 필요 시 API 레이어로부터 import

### QueryKey

- 별도 queryKey 파일 없음 → queryOptions 내부에 인라인 배열로 정의
- Invalidation 시: `getProjectDetailQueryOptions(id).queryKey`로 접근

### Full Naming Map

| Domain | API Function | Query/Mutation Options |
|--------|-------------|----------------------|
| **Auth** | `getGithubStatus()` | `getGithubStatusQueryOptions()` |
| | `switchAccount(data)` | `switchAccountMutationOptions()` |
| **Projects** | `getProjectList()` | `getProjectListQueryOptions()` |
| | `getProjectDetail(id)` | `getProjectDetailQueryOptions(id)` |
| | `createProject(data)` | `createProjectMutationOptions()` |
| | `updateProject(id, data)` | `updateProjectMutationOptions()` |
| | `deleteProject(id)` | `deleteProjectMutationOptions()` |
| **PRs** | `getPrList(projectId, params)` | `getPrListQueryOptions(projectId, params)` |
| | `getPrDetail(projectId, prNumber, origin)` | `getPrDetailQueryOptions(projectId, prNumber, origin)` |
| | `checkoutPr(projectId, prNumber, body)` | `checkoutPrMutationOptions()` |
| **ChatSessions** | `getChatSessionList(projectId, prNumber)` | `getChatSessionListQueryOptions(projectId, prNumber)` |
| | `getChatSessionHistory(projectId, prNumber, sessionId)` | `getChatSessionHistoryQueryOptions(projectId, prNumber, sessionId)` |
| **FS** | `browseFs(path)` | `browseFsQueryOptions(path)` |
| **Git** | `generateCommitMessage(projectId, body)` | `generateCommitMessageMutationOptions()` |
| | `commitAndPush(projectId, body)` | `commitAndPushMutationOptions()` |

### Target Folder Structure

```
shared/
├── apis/                  ← 순수 HTTP 함수 + 타입
│   ├── client.ts          ← 기존 유지
│   ├── index.ts           ← export * from each domain
│   ├── auth.ts
│   ├── projects.ts
│   ├── prs.ts
│   ├── chatSessions.ts
│   ├── fs.ts
│   └── git.ts
├── queries/               ← TanStack Query options
│   ├── index.ts           ← export * from each domain
│   ├── auth.ts
│   ├── projects.ts
│   ├── prs.ts
│   ├── chatSessions.ts
│   ├── fs.ts
│   └── git.ts
```

### Migration Order

1. **Task 1**: `shared/queries/` 생성 (일시적으로 `../apis/client`에서 직접 import)
2. **Task 2**: 14개 consumer 파일 import + 사용 코드 변경
3. **Task 3**: 기존 `shared/apis/{domain}/` 폴더 삭제 + flat API 파일 생성
4. **Task 4**: queries가 API 레이어를 사용하도록 연결
5. **Task 5**: CLAUDE.md 업데이트 + 빌드 검증

---

### Task 1: Create Queries Layer

`shared/queries/`에 모든 query/mutation 함수를 생성한다.
이 단계에서는 아직 API 레이어가 없으므로, `../apis/client`의 HTTP 함수를 직접 사용한다.

**Files:**
- Create: `frontend/src/shared/queries/auth.ts`
- Create: `frontend/src/shared/queries/projects.ts`
- Create: `frontend/src/shared/queries/prs.ts`
- Create: `frontend/src/shared/queries/chatSessions.ts`
- Create: `frontend/src/shared/queries/fs.ts`
- Create: `frontend/src/shared/queries/git.ts`
- Create: `frontend/src/shared/queries/index.ts`

- [ ] **Step 1: Create `queries/auth.ts`**

```ts
// frontend/src/shared/queries/auth.ts
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { apiGet, apiPost } from '../apis/client';
import type {
  GitHubAuthStatus,
  SwitchAccountBody,
} from '@lgtmai/backend/types';

export const getGithubStatusQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'githubStatus'],
    queryFn: () => apiGet<GitHubAuthStatus>('/api/auth/github/status'),
  });

export const switchAccountMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: SwitchAccountBody) =>
      apiPost<GitHubAuthStatus, SwitchAccountBody>(
        '/api/auth/github/switch',
        data
      ),
  });
```

- [ ] **Step 2: Create `queries/projects.ts`**

```ts
// frontend/src/shared/queries/projects.ts
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiDelete } from '../apis/client';
import type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
} from '@lgtmai/backend/types';

export const getProjectListQueryOptions = () =>
  queryOptions({
    queryKey: ['projects', 'list'],
    queryFn: () => apiGet<Project[]>('/api/projects'),
  });

export const getProjectDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['projects', 'detail', id],
    queryFn: () => apiGet<ProjectDetail>(`/api/projects/${id}`),
  });

export const createProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: (data: CreateProjectBody) =>
      apiPost<Project, CreateProjectBody>('/api/projects', data),
  });

export const updateProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectBody }) =>
      apiPatch<Project, UpdateProjectBody>(`/api/projects/${id}`, data),
  });

export const deleteProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: (id: string) => apiDelete(`/api/projects/${id}`),
  });
```

- [ ] **Step 3: Create `queries/prs.ts`**

```ts
// frontend/src/shared/queries/prs.ts
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { apiGet, apiPost } from '../apis/client';
import type {
  PaginatedPRList,
  PRDetail,
  PRState,
  CheckoutPRBranchBody,
  CheckoutPRBranchResult,
} from '@lgtmai/backend/types';

export const getPrListQueryOptions = (
  projectId: string,
  params?: { state: PRState; page: number; limit: number; origin?: string }
) =>
  queryOptions({
    queryKey: ['prs', 'list', projectId, params ?? {}] as const,
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.state) searchParams.set('state', params.state);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.origin) searchParams.set('origin', params.origin);
      const query = searchParams.toString();
      return apiGet<PaginatedPRList>(
        `/api/projects/${projectId}/prs${query ? `?${query}` : ''}`
      );
    },
  });

export const getPrDetailQueryOptions = (
  projectId: string,
  prNumber: number,
  origin?: string
) =>
  queryOptions({
    queryKey: [
      'prs',
      'detail',
      projectId,
      prNumber,
      ...(origin ? [origin] : []),
    ] as const,
    queryFn: () => {
      const params = origin ? `?origin=${encodeURIComponent(origin)}` : '';
      return apiGet<PRDetail>(
        `/api/projects/${projectId}/prs/${prNumber}${params}`
      );
    },
  });

export const checkoutPrMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      prNumber,
      body,
    }: {
      projectId: string;
      prNumber: number;
      body?: CheckoutPRBranchBody;
    }) =>
      apiPost<CheckoutPRBranchResult, CheckoutPRBranchBody | undefined>(
        `/api/projects/${projectId}/prs/${prNumber}/checkout`,
        body
      ),
  });
```

- [ ] **Step 4: Create `queries/chatSessions.ts`**

```ts
// frontend/src/shared/queries/chatSessions.ts
import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../apis/client';
import type {
  ChatSessionSummary,
  ChatSessionHistoryResponse,
} from '@lgtmai/backend/types';

export const getChatSessionListQueryOptions = (
  projectId: string,
  prNumber: number
) =>
  queryOptions({
    queryKey: ['chatSessions', 'list', projectId, prNumber] as const,
    queryFn: () =>
      apiGet<ChatSessionSummary[]>(
        `/api/projects/${projectId}/prs/${prNumber}/chat-sessions`
      ),
  });

export const getChatSessionHistoryQueryOptions = (
  projectId: string,
  prNumber: number,
  sessionId: string
) =>
  queryOptions({
    queryKey: [
      'chatSessions',
      'history',
      projectId,
      prNumber,
      sessionId,
    ] as const,
    queryFn: () =>
      apiGet<ChatSessionHistoryResponse>(
        `/api/projects/${projectId}/prs/${prNumber}/chat-sessions/${sessionId}/history`
      ),
  });
```

- [ ] **Step 5: Create `queries/fs.ts`**

```ts
// frontend/src/shared/queries/fs.ts
import { queryOptions } from '@tanstack/react-query';
import { apiGet } from '../apis/client';
import type { BrowseResponse } from '@lgtmai/backend/types';

export const browseFsQueryOptions = (path?: string) =>
  queryOptions({
    queryKey: ['fs', 'browse', path] as const,
    queryFn: () => {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      return apiGet<BrowseResponse>(`/api/fs/browse${params}`);
    },
  });
```

- [ ] **Step 6: Create `queries/git.ts`**

```ts
// frontend/src/shared/queries/git.ts
import { mutationOptions } from '@tanstack/react-query';
import { apiPost } from '../apis/client';
import type {
  CommitMessageResponse,
  CommitAndPushResponse,
} from '@lgtmai/backend/types';

interface GenerateCommitMessageBody {
  prContext?: {
    title: string;
    body: string;
    reviewComment: string;
  };
}

interface CommitAndPushBody {
  commitMessage: string;
  push?: boolean;
}

export const generateCommitMessageMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: GenerateCommitMessageBody;
    }) =>
      apiPost<CommitMessageResponse, GenerateCommitMessageBody>(
        `/api/projects/${projectId}/commit-message`,
        body
      ),
  });

export const commitAndPushMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: CommitAndPushBody;
    }) =>
      apiPost<CommitAndPushResponse, CommitAndPushBody>(
        `/api/projects/${projectId}/commit-and-push`,
        body
      ),
  });
```

- [ ] **Step 7: Create `queries/index.ts`**

```ts
// frontend/src/shared/queries/index.ts
export * from './auth';
export * from './projects';
export * from './prs';
export * from './chatSessions';
export * from './fs';
export * from './git';
```

- [ ] **Step 8: Build verification**

Run: `pnpm --filter @lgtmai/frontend build`
Expected: SUCCESS (queries layer is created but not yet consumed)

- [ ] **Step 9: Commit**

```bash
git add frontend/src/shared/queries/
git commit -m "refactor: create queries layer with inline queryKeys"
```

---

### Task 2: Migrate Consumers to Queries Layer

14개 consumer 파일의 import와 사용 코드를 변경한다.
객체 메서드 호출(`projectsQuery.list()`)을 함수 호출(`getProjectListQueryOptions()`)로 전환한다.

**Files:**
- Modify: `frontend/src/shared/components/AccountMenu/AccountMenu.tsx`
- Modify: `frontend/src/domains/Projects/components/CreateProjectModal/CreateProjectModal.tsx`
- Modify: `frontend/src/domains/Projects/components/DeleteProjectModal/DeleteProjectModal.tsx`
- Modify: `frontend/src/domains/Projects/components/EditProjectModal/EditProjectModal.tsx`
- Modify: `frontend/src/domains/Projects/components/FolderBrowser/FolderBrowser.tsx`
- Modify: `frontend/src/domains/Projects/components/ProjectCardList/ProjectCardList.tsx`
- Modify: `frontend/src/domains/PRList/page.tsx`
- Modify: `frontend/src/domains/PRList/components/PRTable/PRTable.tsx`
- Modify: `frontend/src/domains/PRDetail/components/PRDetailContent/PRDetailContent.tsx`
- Modify: `frontend/src/domains/PRDetail/components/ChatPanel/ChatHistoryList.tsx`
- Modify: `frontend/src/domains/PRDetail/components/ActivityTimeline/hooks/useActivityChat.tsx`
- Modify: `frontend/src/domains/PRDetail/hooks/usePRChat.ts`
- Modify: `frontend/src/domains/PRDetail/hooks/useChatPanelSync.ts`
- Modify: `frontend/src/domains/PRDetail/hooks/useCommitAndPush.ts`

- [ ] **Step 1: Migrate `AccountMenu.tsx`**

```diff
- import { authQuery, authMutation } from '@/shared/apis';
+ import { getGithubStatusQueryOptions, switchAccountMutationOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useSuspenseQuery(authQuery.githubStatus())
+ useSuspenseQuery(getGithubStatusQueryOptions())

- useMutation(authMutation.switchAccount())
+ useMutation(switchAccountMutationOptions())
```

- [ ] **Step 2: Migrate `CreateProjectModal.tsx`**

```diff
- import { projectsMutation, projectsQuery } from '@/shared/apis';
+ import { createProjectMutationOptions, getProjectListQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useMutation({
-   ...projectsMutation.create(),
-   meta: { invalidates: [projectsQuery.list().queryKey] },
+ useMutation({
+   ...createProjectMutationOptions(),
+   meta: { invalidates: [getProjectListQueryOptions().queryKey] },
```

- [ ] **Step 3: Migrate `DeleteProjectModal.tsx`**

```diff
- import { projectsMutation, projectsQuery } from '@/shared/apis';
+ import { deleteProjectMutationOptions, getProjectListQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useMutation({
-   ...projectsMutation.delete(),
-   meta: { invalidates: [projectsQuery.list().queryKey] },
+ useMutation({
+   ...deleteProjectMutationOptions(),
+   meta: { invalidates: [getProjectListQueryOptions().queryKey] },
```

- [ ] **Step 4: Migrate `EditProjectModal.tsx`**

```diff
- import { projectsMutation, projectsQuery } from '@/shared/apis';
+ import { updateProjectMutationOptions, getProjectListQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useMutation({
-   ...projectsMutation.update(),
-   meta: { invalidates: [projectsQuery.list().queryKey] },
+ useMutation({
+   ...updateProjectMutationOptions(),
+   meta: { invalidates: [getProjectListQueryOptions().queryKey] },
```

- [ ] **Step 5: Migrate `FolderBrowser.tsx`**

```diff
- import { fsQuery } from '@/shared/apis';
+ import { browseFsQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useSuspenseQuery(fsQuery.browse(currentPath))
+ useSuspenseQuery(browseFsQueryOptions(currentPath))
```

- [ ] **Step 6: Migrate `ProjectCardList.tsx`**

```diff
- import { projectsQuery } from '@/shared/apis';
+ import { getProjectListQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useSuspenseQuery(projectsQuery.list())
+ useSuspenseQuery(getProjectListQueryOptions())
```

- [ ] **Step 7: Migrate `PRList/page.tsx`**

```diff
- import { projectsQuery } from '@/shared/apis';
+ import { getProjectDetailQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useQuery({
-   ...projectsQuery.detail(projectId!),
+ useQuery({
+   ...getProjectDetailQueryOptions(projectId!),
```

- [ ] **Step 8: Migrate `PRTable.tsx`**

```diff
- import { prsQuery } from '@/shared/apis';
+ import { getPrListQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useSuspenseQuery(prsQuery.list(projectId, { state, page, limit, origin }))
+ useSuspenseQuery(getPrListQueryOptions(projectId, { state, page, limit, origin }))
```

- [ ] **Step 9: Migrate `PRDetailContent.tsx`**

```diff
- import { projectsQuery, prsQuery } from '@/shared/apis';
+ import { getProjectDetailQueryOptions, getPrDetailQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- queries: [
-   projectsQuery.detail(projectId),
-   prsQuery.detail(projectId, Number(prNumber), origin),
- ],
+ queries: [
+   getProjectDetailQueryOptions(projectId),
+   getPrDetailQueryOptions(projectId, Number(prNumber), origin),
+ ],
```

- [ ] **Step 10: Migrate `ChatHistoryList.tsx`**

```diff
- import { chatSessionsQuery } from '@/shared/apis';
+ import { getChatSessionListQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useQuery(chatSessionsQuery.list(projectId, prNumber))
+ useQuery(getChatSessionListQueryOptions(projectId, prNumber))
```

- [ ] **Step 11: Migrate `useActivityChat.tsx`**

```diff
- import { prsMutation, projectsQueryKey } from '@/shared/apis';
+ import { checkoutPrMutationOptions, getProjectDetailQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useMutation(prsMutation.checkout())
+ useMutation(checkoutPrMutationOptions())

- queryClient.invalidateQueries({
-   queryKey: projectsQueryKey.detail(projectId),
- });
+ queryClient.invalidateQueries({
+   queryKey: getProjectDetailQueryOptions(projectId).queryKey,
+ });
```

- [ ] **Step 12: Migrate `usePRChat.ts`**

```diff
- import { chatSessionsQuery } from '@/shared/apis';
+ import { getChatSessionHistoryQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- ...chatSessionsQuery.history(projectId, prNumber, selectedSessionId ?? ''),
+ ...getChatSessionHistoryQueryOptions(projectId, prNumber, selectedSessionId ?? ''),
```

- [ ] **Step 13: Migrate `useChatPanelSync.ts`**

```diff
- import { chatSessionsQueryKey } from '@/shared/apis';
+ import { getChatSessionListQueryOptions } from '@/shared/queries';
```

Usage changes:
```diff
- queryClient.invalidateQueries({
-   queryKey: chatSessionsQueryKey.list(
-     state.prContext.projectId,
-     state.prContext.prNumber
-   ),
- });
+ queryClient.invalidateQueries({
+   queryKey: getChatSessionListQueryOptions(
+     state.prContext.projectId,
+     state.prContext.prNumber
+   ).queryKey,
+ });
```

- [ ] **Step 14: Migrate `useCommitAndPush.ts`**

```diff
- import { gitMutation } from '@/shared/apis';
+ import { generateCommitMessageMutationOptions, commitAndPushMutationOptions } from '@/shared/queries';
```

Usage changes:
```diff
- useMutation(gitMutation.generateCommitMessage())
+ useMutation(generateCommitMessageMutationOptions())

- useMutation(gitMutation.commitAndPush())
+ useMutation(commitAndPushMutationOptions())
```

- [ ] **Step 15: Build verification**

Run: `pnpm --filter @lgtmai/frontend build`
Expected: SUCCESS

- [ ] **Step 16: Commit**

```bash
git add -A
git commit -m "refactor: migrate all consumers from apis to queries layer"
```

---

### Task 3: Replace Domain Folders with Flat API Files

기존 `shared/apis/{domain}/` 폴더를 삭제하고, 순수 HTTP 함수 + 타입만 담은 flat 파일로 교체한다.

**Files:**
- Delete: `frontend/src/shared/apis/auth/` (entire folder)
- Delete: `frontend/src/shared/apis/projects/` (entire folder)
- Delete: `frontend/src/shared/apis/prs/` (entire folder)
- Delete: `frontend/src/shared/apis/chatSessions/` (entire folder)
- Delete: `frontend/src/shared/apis/fs/` (entire folder)
- Delete: `frontend/src/shared/apis/git/` (entire folder)
- Create: `frontend/src/shared/apis/auth.ts`
- Create: `frontend/src/shared/apis/projects.ts`
- Create: `frontend/src/shared/apis/prs.ts`
- Create: `frontend/src/shared/apis/chatSessions.ts`
- Create: `frontend/src/shared/apis/fs.ts`
- Create: `frontend/src/shared/apis/git.ts`
- Modify: `frontend/src/shared/apis/index.ts`

- [ ] **Step 1: Delete old domain folders**

```bash
rm -rf frontend/src/shared/apis/auth
rm -rf frontend/src/shared/apis/projects
rm -rf frontend/src/shared/apis/prs
rm -rf frontend/src/shared/apis/chatSessions
rm -rf frontend/src/shared/apis/fs
rm -rf frontend/src/shared/apis/git
```

- [ ] **Step 2: Create `apis/auth.ts`**

```ts
// frontend/src/shared/apis/auth.ts
import { apiGet, apiPost } from './client';
import type {
  GitHubAuthStatus,
  SwitchAccountBody,
} from '@lgtmai/backend/types';

export type { GitHubAuthStatus, SwitchAccountBody };

export const getGithubStatus = () =>
  apiGet<GitHubAuthStatus>('/api/auth/github/status');

export const switchAccount = (data: SwitchAccountBody) =>
  apiPost<GitHubAuthStatus, SwitchAccountBody>(
    '/api/auth/github/switch',
    data
  );
```

- [ ] **Step 3: Create `apis/projects.ts`**

```ts
// frontend/src/shared/apis/projects.ts
import { apiGet, apiPost, apiPatch, apiDelete } from './client';
import type {
  Project,
  ProjectDetail,
  CreateProjectBody,
  UpdateProjectBody,
} from '@lgtmai/backend/types';

export type { Project, ProjectDetail, CreateProjectBody, UpdateProjectBody };

export const getProjectList = () =>
  apiGet<Project[]>('/api/projects');

export const getProjectDetail = (id: string) =>
  apiGet<ProjectDetail>(`/api/projects/${id}`);

export const createProject = (data: CreateProjectBody) =>
  apiPost<Project, CreateProjectBody>('/api/projects', data);

export const updateProject = (id: string, data: UpdateProjectBody) =>
  apiPatch<Project, UpdateProjectBody>(`/api/projects/${id}`, data);

export const deleteProject = (id: string) =>
  apiDelete(`/api/projects/${id}`);
```

- [ ] **Step 4: Create `apis/prs.ts`**

```ts
// frontend/src/shared/apis/prs.ts
import { apiGet, apiPost } from './client';
import type {
  PaginatedPRList,
  PRDetail,
  PRState,
  CheckoutPRBranchBody,
  CheckoutPRBranchResult,
} from '@lgtmai/backend/types';

export type {
  PaginatedPRList,
  PRDetail,
  PRState,
  CheckoutPRBranchBody,
  CheckoutPRBranchResult,
};

export const getPrList = (
  projectId: string,
  params?: { state: PRState; page: number; limit: number; origin?: string }
) => {
  const searchParams = new URLSearchParams();
  if (params?.state) searchParams.set('state', params.state);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.origin) searchParams.set('origin', params.origin);
  const query = searchParams.toString();
  return apiGet<PaginatedPRList>(
    `/api/projects/${projectId}/prs${query ? `?${query}` : ''}`
  );
};

export const getPrDetail = (
  projectId: string,
  prNumber: number,
  origin?: string
) => {
  const params = origin ? `?origin=${encodeURIComponent(origin)}` : '';
  return apiGet<PRDetail>(
    `/api/projects/${projectId}/prs/${prNumber}${params}`
  );
};

export const checkoutPr = (
  projectId: string,
  prNumber: number,
  body?: CheckoutPRBranchBody
) =>
  apiPost<CheckoutPRBranchResult, CheckoutPRBranchBody | undefined>(
    `/api/projects/${projectId}/prs/${prNumber}/checkout`,
    body
  );
```

- [ ] **Step 5: Create `apis/chatSessions.ts`**

```ts
// frontend/src/shared/apis/chatSessions.ts
import { apiGet } from './client';
import type {
  ChatSessionSummary,
  ChatSessionHistoryResponse,
} from '@lgtmai/backend/types';

export type { ChatSessionSummary, ChatSessionHistoryResponse };

export const getChatSessionList = (projectId: string, prNumber: number) =>
  apiGet<ChatSessionSummary[]>(
    `/api/projects/${projectId}/prs/${prNumber}/chat-sessions`
  );

export const getChatSessionHistory = (
  projectId: string,
  prNumber: number,
  sessionId: string
) =>
  apiGet<ChatSessionHistoryResponse>(
    `/api/projects/${projectId}/prs/${prNumber}/chat-sessions/${sessionId}/history`
  );
```

- [ ] **Step 6: Create `apis/fs.ts`**

```ts
// frontend/src/shared/apis/fs.ts
import { apiGet } from './client';
import type { BrowseResponse } from '@lgtmai/backend/types';

export type { BrowseResponse };

export const browseFs = (path?: string) => {
  const params = path ? `?path=${encodeURIComponent(path)}` : '';
  return apiGet<BrowseResponse>(`/api/fs/browse${params}`);
};
```

- [ ] **Step 7: Create `apis/git.ts`**

```ts
// frontend/src/shared/apis/git.ts
import { apiPost } from './client';
import type {
  CommitMessageResponse,
  CommitAndPushResponse,
} from '@lgtmai/backend/types';

export type { CommitMessageResponse, CommitAndPushResponse };

export interface GenerateCommitMessageBody {
  prContext?: {
    title: string;
    body: string;
    reviewComment: string;
  };
}

export interface CommitAndPushBody {
  commitMessage: string;
  push?: boolean;
}

export const generateCommitMessage = (
  projectId: string,
  body: GenerateCommitMessageBody
) =>
  apiPost<CommitMessageResponse, GenerateCommitMessageBody>(
    `/api/projects/${projectId}/commit-message`,
    body
  );

export const commitAndPush = (projectId: string, body: CommitAndPushBody) =>
  apiPost<CommitAndPushResponse, CommitAndPushBody>(
    `/api/projects/${projectId}/commit-and-push`,
    body
  );
```

- [ ] **Step 8: Update `apis/index.ts`**

```ts
// frontend/src/shared/apis/index.ts
export { ApiClientError } from './client';
export * from './auth';
export * from './projects';
export * from './prs';
export * from './chatSessions';
export * from './fs';
export * from './git';
```

- [ ] **Step 9: Build verification**

Run: `pnpm --filter @lgtmai/frontend build`
Expected: SUCCESS

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: replace api domain folders with flat HTTP function files"
```

---

### Task 4: Wire Queries to API Layer

`shared/queries/` 파일들이 `../apis/client`를 직접 사용하던 것을 API 함수로 교체한다.
이로써 queries는 HTTP 엔드포인트와 타입을 모르고, API 레이어에 위임한다.

**Files:**
- Modify: `frontend/src/shared/queries/auth.ts`
- Modify: `frontend/src/shared/queries/projects.ts`
- Modify: `frontend/src/shared/queries/prs.ts`
- Modify: `frontend/src/shared/queries/chatSessions.ts`
- Modify: `frontend/src/shared/queries/fs.ts`
- Modify: `frontend/src/shared/queries/git.ts`

- [ ] **Step 1: Refactor `queries/auth.ts`**

```ts
// frontend/src/shared/queries/auth.ts
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getGithubStatus, switchAccount } from '../apis';

export const getGithubStatusQueryOptions = () =>
  queryOptions({
    queryKey: ['auth', 'githubStatus'],
    queryFn: () => getGithubStatus(),
  });

export const switchAccountMutationOptions = () =>
  mutationOptions({
    mutationFn: switchAccount,
  });
```

- [ ] **Step 2: Refactor `queries/projects.ts`**

```ts
// frontend/src/shared/queries/projects.ts
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import {
  getProjectList,
  getProjectDetail,
  createProject,
  updateProject,
  deleteProject,
} from '../apis';
import type { UpdateProjectBody } from '../apis';

export const getProjectListQueryOptions = () =>
  queryOptions({
    queryKey: ['projects', 'list'],
    queryFn: () => getProjectList(),
  });

export const getProjectDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['projects', 'detail', id],
    queryFn: () => getProjectDetail(id),
  });

export const createProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: createProject,
  });

export const updateProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectBody }) =>
      updateProject(id, data),
  });

export const deleteProjectMutationOptions = () =>
  mutationOptions({
    mutationFn: deleteProject,
  });
```

- [ ] **Step 3: Refactor `queries/prs.ts`**

```ts
// frontend/src/shared/queries/prs.ts
import { queryOptions, mutationOptions } from '@tanstack/react-query';
import { getPrList, getPrDetail, checkoutPr } from '../apis';
import type { PRState, CheckoutPRBranchBody } from '../apis';

export const getPrListQueryOptions = (
  projectId: string,
  params?: { state: PRState; page: number; limit: number; origin?: string }
) =>
  queryOptions({
    queryKey: ['prs', 'list', projectId, params ?? {}] as const,
    queryFn: () => getPrList(projectId, params),
  });

export const getPrDetailQueryOptions = (
  projectId: string,
  prNumber: number,
  origin?: string
) =>
  queryOptions({
    queryKey: [
      'prs',
      'detail',
      projectId,
      prNumber,
      ...(origin ? [origin] : []),
    ] as const,
    queryFn: () => getPrDetail(projectId, prNumber, origin),
  });

export const checkoutPrMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      prNumber,
      body,
    }: {
      projectId: string;
      prNumber: number;
      body?: CheckoutPRBranchBody;
    }) => checkoutPr(projectId, prNumber, body),
  });
```

- [ ] **Step 4: Refactor `queries/chatSessions.ts`**

```ts
// frontend/src/shared/queries/chatSessions.ts
import { queryOptions } from '@tanstack/react-query';
import { getChatSessionList, getChatSessionHistory } from '../apis';

export const getChatSessionListQueryOptions = (
  projectId: string,
  prNumber: number
) =>
  queryOptions({
    queryKey: ['chatSessions', 'list', projectId, prNumber] as const,
    queryFn: () => getChatSessionList(projectId, prNumber),
  });

export const getChatSessionHistoryQueryOptions = (
  projectId: string,
  prNumber: number,
  sessionId: string
) =>
  queryOptions({
    queryKey: [
      'chatSessions',
      'history',
      projectId,
      prNumber,
      sessionId,
    ] as const,
    queryFn: () => getChatSessionHistory(projectId, prNumber, sessionId),
  });
```

- [ ] **Step 5: Refactor `queries/fs.ts`**

```ts
// frontend/src/shared/queries/fs.ts
import { queryOptions } from '@tanstack/react-query';
import { browseFs } from '../apis';

export const browseFsQueryOptions = (path?: string) =>
  queryOptions({
    queryKey: ['fs', 'browse', path] as const,
    queryFn: () => browseFs(path),
  });
```

- [ ] **Step 6: Refactor `queries/git.ts`**

```ts
// frontend/src/shared/queries/git.ts
import { mutationOptions } from '@tanstack/react-query';
import { generateCommitMessage, commitAndPush } from '../apis';
import type { GenerateCommitMessageBody, CommitAndPushBody } from '../apis';

export const generateCommitMessageMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: GenerateCommitMessageBody;
    }) => generateCommitMessage(projectId, body),
  });

export const commitAndPushMutationOptions = () =>
  mutationOptions({
    mutationFn: ({
      projectId,
      body,
    }: {
      projectId: string;
      body: CommitAndPushBody;
    }) => commitAndPush(projectId, body),
  });
```

- [ ] **Step 7: Build verification**

Run: `pnpm --filter @lgtmai/frontend build`
Expected: SUCCESS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/shared/queries/
git commit -m "refactor: wire queries layer to use API layer functions"
```

---

### Task 5: Update Documentation and Final Verification

**Files:**
- Modify: `frontend/CLAUDE.md`

- [ ] **Step 1: Update `frontend/CLAUDE.md`**

Layer Hierarchy 섹션 아래에 추가:

```markdown
## API & Query Layer

```
shared/
├── apis/              # 순수 HTTP 함수 + 타입 (TanStack Query 무관)
│   ├── client.ts      # fetch wrapper (apiGet, apiPost, apiPatch, apiDelete)
│   ├── auth.ts        # getGithubStatus, switchAccount
│   ├── projects.ts    # getProjectList, getProjectDetail, createProject, ...
│   └── ...
├── queries/           # TanStack Query options (queryKey 인라인 정의)
│   ├── auth.ts        # getGithubStatusQueryOptions, switchAccountMutationOptions
│   ├── projects.ts    # getProjectListQueryOptions, createProjectMutationOptions, ...
│   └── ...
```

### Convention

- **apis/**: 순수 HTTP 함수 + 타입 관리. GET → `getXxx`, 변경 → 액션 동사
- **queries/**: `queryOptions`/`mutationOptions` 정의. queryKey 인라인 배열
- **Naming**: API `getProjectList` → Query `getProjectListQueryOptions`
- **Type inference**: queryOptions/mutationOptions에 명시적 제네릭 사용하지 않음
- **Invalidation**: `getProjectDetailQueryOptions(id).queryKey` 사용
```

- [ ] **Step 2: Full build verification**

Run: `pnpm --filter @lgtmai/frontend build`
Expected: SUCCESS

- [ ] **Step 3: Dev server manual check**

Run: `pnpm run dev`
수동 검증:
- Projects 목록 페이지 로드
- PR 목록 페이지 로드
- PR 상세 페이지 로드
- Chat panel 열기/닫기

- [ ] **Step 4: Commit**

```bash
git add frontend/CLAUDE.md
git commit -m "docs: update CLAUDE.md with API and queries layer conventions"
```

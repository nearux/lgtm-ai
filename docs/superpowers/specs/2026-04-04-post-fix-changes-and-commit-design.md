# Post-Fix Changes Summary & Commit/Push — Backend Design Spec

> GitHub Issue: #71
> Scope: Backend only (프론트엔드 변경 없음)

## Problem

Fix 액션 완료 후 `done` 이벤트만 전송되며, 어떤 파일이 어떻게 변경되었는지 사용자에게 제공하지 않는다.
커밋/푸시도 별도로 수행해야 하므로 fix → 변경 확인 → 커밋 워크플로우가 끊긴다.

## Solution Overview

1. **`file_changes` WebSocket 이벤트**: `done` 직후 자동으로 git status/diff 결과를 전송
2. **`POST /api/git/commit-message`**: Claude 기반 커밋 메시지 생성
3. **`POST /api/git/commit-and-push`**: git add -A → commit → push 일괄 수행

## Detailed Design

### 1. WebSocket: `file_changes` 이벤트

#### 발생 시점
`ClaudeSessionManager`에서 `done` 이벤트 처리 직후, 해당 세션의 `workingDir`에서 git 명령을 실행하여 변경 사항을 수집하고 WebSocket으로 전송한다.

#### 메시지 타입

```typescript
type FileChangeStatus = 'added' | 'modified' | 'deleted'

type FileChange = {
  path: string
  status: FileChangeStatus
  additions: number
  deletions: number
  diff: string // unified diff 전체 (제한 없음)
}

type FileChangesSummary = {
  totalFiles: number
  totalAdditions: number
  totalDeletions: number
}

type FileChangesMessage = {
  type: 'file_changes'
  requestId: string
  changes: {
    files: FileChange[]
    summary: FileChangesSummary
  }
}
```

#### 동작
- `git status --porcelain`으로 변경 파일 목록 파악
- `git diff` + `git diff --cached`로 staged/unstaged 모두 포함한 unified diff 수집
- 파일별 additions/deletions는 `git diff --numstat`으로 파싱
- 변경 파일이 없으면 `files: []`, `summary: { totalFiles: 0, ... }`로 전송

#### 타입 등록
`backend/types/claude.ts`의 `ServerMessage` 유니온 타입에 `FileChangesMessage` 추가.

### 2. HTTP: 커밋 메시지 생성

```
POST /api/git/commit-message
```

#### Request Body

```typescript
type CommitMessageRequest = {
  workingDir: string
  prContext?: {
    title: string
    body: string
    reviewComment: string
  }
}
```

#### Response

```typescript
type CommitMessageResponse = {
  message: string
}
```

#### 동작
- `workingDir`에서 `git diff`를 읽는다
- diff 내용 + `prContext`(있으면)를 Claude에 전달하여 커밋 메시지 생성
- Claude 호출은 기존 `ClaudeProcess`(CLI 기반)를 사용 — Anthropic SDK 미사용, 프로젝트 컨벤션 유지
- `ClaudeProcess`의 스트리밍 출력에서 최종 `result`만 추출하여 응답
- Claude 호출 실패 시 에러 응답 반환

### 3. HTTP: 커밋 & 푸시

```
POST /api/git/commit-and-push
```

#### Request Body

```typescript
type CommitAndPushRequest = {
  workingDir: string
  commitMessage: string
}
```

#### Response

```typescript
type CommitAndPushResponse = {
  success: boolean
  commitHash?: string
  error?: string
}
```

#### 동작
1. `git add -A` — 모든 변경 파일 staging
2. `git commit -m "<commitMessage>"` — 커밋 생성
3. `git push` — 현재 브랜치로 push
4. 성공 시 `commitHash` 포함하여 반환
5. 어떤 단계에서든 실패 시 즉시 `{ success: false, error: "<단계>: <에러 메시지>" }` 반환

### 4. Backend 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|----------|------|
| `backend/types/claude.ts` | 수정 | `FileChangesMessage` 타입 추가, `ServerMessage` 유니온 확장 |
| `backend/services/claude/ClaudeSessionManager.ts` | 수정 | `done` 이벤트 후 git diff 수집 → `file_changes` 전송 로직 추가 |
| `backend/services/GitService.ts` | 신규 | git 명령 실행 유틸 + Claude 커밋 메시지 생성 |
| `backend/controllers/GitController.ts` | 신규 | tsoa 기반 `/api/git/*` 라우팅 (두 개 엔드포인트) |

### 5. Design Decisions

| 결정 | 선택 | 이유 |
|------|------|------|
| 변경 사항 전송 시점 | `done` 직후 자동 | 사용자가 별도 요청 없이 바로 확인 가능 |
| 변경 사항 전송 방식 | WebSocket | 이미 열려있는 연결 활용, fix 흐름과 자연스럽게 연결 |
| 커밋 메시지 생성 방식 | Claude 호출 (non-streaming) | 맥락 반영한 자연스러운 메시지, 스트리밍 불필요 |
| 커밋/푸시 API 방식 | HTTP POST | 단순 요청-응답, WebSocket 불필요 |
| 커밋 대상 | 전체 변경 파일 (git add -A) | fix 결과 전체를 커밋하는 것이 자연스러움 |
| diff 크기 제한 | 없음 | fix 특성상 대규모 변경 가능성 낮음 |
| diff 표시 방식 | 전체 unified diff (GitHub PR diff 스타일) | 사용자가 변경 내용을 충분히 리뷰 가능 |

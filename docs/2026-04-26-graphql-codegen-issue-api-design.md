# Design: graphql-codegen 도입 + Issue API 추가

Date: 2026-04-26

## 목표

1. 백엔드에서 GraphQL 쿼리를 인라인 문자열 대신 `.gql` 파일로 분리
2. `@graphql-codegen/cli`로 빌드 타임에 TypeScript 타입 자동 생성
3. Issue 목록/상세 조회 API 추가

## 디렉토리 구조

```
backend/
  graphql/
    schema/
      github.graphql          ← GitHub GraphQL 스키마 (introspection으로 생성, 체크인)
    queries/
      pr-list.gql             ← 기존 PR 목록 쿼리 이동
      pr-cursor.gql           ← 기존 PR cursor 쿼리 이동
      issue-list.gql          ← 신규
      issue-cursor.gql        ← 신규
      issue-detail.gql        ← 신규
    generated/
      graphql.ts              ← codegen 결과물 (자동 생성, git 체크인)
  codegen.ts                  ← graphql-codegen 설정
```

## GraphQL 쿼리

### pr-list.gql

```graphql
query PRList($owner: String!, $name: String!, $limit: Int!, $states: [PullRequestState!]!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(first: $limit, states: $states, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      nodes {
        number
        title
        body
        state
        createdAt
        updatedAt
        totalCommentsCount
        assignees(first: 20) { nodes { id login name } }
        author {
          login
          avatarUrl
          ... on User { id name }
          ... on Bot { id }
        }
      }
    }
  }
}
```

### pr-cursor.gql

```graphql
query PRCursor($owner: String!, $name: String!, $skip: Int!, $states: [PullRequestState!]!, $after: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(first: $skip, after: $after, states: $states, orderBy: {field: CREATED_AT, direction: DESC}) {
      pageInfo { endCursor }
    }
  }
}
```

### issue-list.gql

```graphql
query IssueList($owner: String!, $name: String!, $limit: Int!, $states: [IssueState!]!, $after: String) {
  repository(owner: $owner, name: $name) {
    issues(first: $limit, states: $states, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      nodes {
        number
        title
        body
        state
        createdAt
        updatedAt
        comments { totalCount }
        assignees(first: 20) { nodes { id login name } }
        author {
          login
          avatarUrl
          ... on User { id name }
          ... on Bot { id }
        }
        labels(first: 10) { nodes { id name color } }
      }
    }
  }
}
```

### issue-cursor.gql

```graphql
query IssueCursor($owner: String!, $name: String!, $skip: Int!, $states: [IssueState!]!, $after: String) {
  repository(owner: $owner, name: $name) {
    issues(first: $skip, after: $after, states: $states, orderBy: {field: CREATED_AT, direction: DESC}) {
      pageInfo { endCursor }
    }
  }
}
```

### issue-detail.gql

```graphql
query IssueDetail($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      title
      body
      state
      createdAt
      updatedAt
      closedAt
      url
      comments(first: 100) {
        nodes {
          id
          author { login avatarUrl ... on User { id name } ... on Bot { id } }
          body
          createdAt
          updatedAt
        }
      }
      assignees(first: 20) { nodes { id login name } }
      author {
        login
        avatarUrl
        ... on User { id name }
        ... on Bot { id }
      }
      labels(first: 10) { nodes { id name color } }
      milestone { id title }
    }
  }
}
```

## 타입 생성

codegen이 각 쿼리에 대해 자동으로 생성하는 타입:

| 타입 | 설명 |
|------|------|
| `PRListQueryVariables` / `PRListQuery` | PR 목록 쿼리 변수/응답 |
| `PRCursorQueryVariables` / `PRCursorQuery` | PR cursor 쿼리 변수/응답 |
| `IssueListQueryVariables` / `IssueListQuery` | Issue 목록 쿼리 변수/응답 |
| `IssueCursorQueryVariables` / `IssueCursorQuery` | Issue cursor 쿼리 변수/응답 |
| `IssueDetailQueryVariables` / `IssueDetailQuery` | Issue 상세 쿼리 변수/응답 |

기존 `types/pullRequests.ts`에서 제거되는 타입:
- `GraphQLPRListResponse`
- `GraphQLCursorResponse`
- `GraphQLPRNode`
- `GraphQLPRAuthor`
- `GraphQLPRAssignee`

## 서비스 레이어

```
modules/projects/
  pr-list.service.ts       ← GraphQL 인라인 쿼리 → .gql 파일 읽기로 교체
  pr-detail.service.ts     ← 변경 없음 (GraphQL 미사용)
  issue-list.service.ts    ← 신규 (PR list와 동일 패턴)
  issue-detail.service.ts  ← 신규
  dto/
    pull-requests.dto.ts   ← 변경 없음
    issue-list.dto.ts      ← 신규
    issue-detail.dto.ts    ← 신규
```

`.gql` 파일은 서비스에서 `fs.readFileSync`로 읽어 `gh api graphql -f query=...`에 전달.

## REST API

| 메서드 | 경로 | 파라미터 | 설명 |
|--------|------|----------|------|
| `GET` | `/api/projects/:projectId/issues` | `page`, `limit`, `state` (`open`\|`closed`) | Issue 목록 |
| `GET` | `/api/projects/:projectId/issues/:issueNumber` | — | Issue 상세 |

## 에러 처리

- `gh` CLI 실패 → 기존 `mapGhError()` 재사용
- GraphQL `errors` 필드 존재 시 → `Error('GraphQL query failed: ...')` throw
- 존재하지 않는 Issue 번호 → `mapGhError`가 `AppError(404)`로 변환

## 테스트

- `issue-list.service.test.ts` — `execFile` mock, 페이징/state 필터 검증
- `issue-detail.service.test.ts` — `execFile` mock, 응답 파싱 검증
- `.gql` 파일 읽기는 실제 파일 경로 기반 (mock 없이)

## 빌드 파이프라인

```json
"codegen": "graphql-codegen --config codegen.ts",
"build": "pnpm codegen && tsoa routes && node esbuild.config.mjs",
"dev": "... pnpm codegen && tsoa spec && tsoa routes && tsx watch ..."
```

esbuild 설정에서 `graphql/queries/*.gql` 파일을 `dist/`에 복사하도록 추가.

## devDependencies 추가

```
@graphql-codegen/cli
@graphql-codegen/typescript
@graphql-codegen/typescript-operations
graphql
```

`graphql` 패키지는 codegen의 peer dependency로만 사용 (runtime 불필요).

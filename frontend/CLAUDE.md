# Frontend Architecture

## Folder Structure (Layer Hierarchy)

```
src/
├── domains/          # Domain-specific pages and related code
│   ├── Projects/
│   ├── PRList/
│   └── PRDetail/
├── features/         # Shared business logic (used across domains)
└── shared/           # Pure utilities and UI (no business logic)
```

### Layer Rules

- **domains**: Hooks, components, and pages used only within each domain (Projects, PRList, PRDetail)
- **features**: Code with business logic shared across multiple domains
- **shared**: Pure utilities and UI components with no business logic

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

## Component Convention

### File Structure

```
components/
└── AComponent/
    ├── AComponent.tsx
    ├── components/        # Internal-only components
    │   └── SubComponent/
    │       └── SubComponent.tsx
    ├── hooks/             # Internal-only hooks
    │   └── useXxx.ts
    └── utils/             # Internal-only utils
        └── xxx.ts
```

### Code Style

```tsx
// AComponent.tsx
interface Props {
  // props definition
}

export const AComponent = ({ ... }: Props) => {
  return (...)
};
```

- Use arrow functions for component definitions
- Always name props interface as `Props`
- Use `export const` instead of `export default`
- Place internal components/hooks/utils in nested folders within the component directory

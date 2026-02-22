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

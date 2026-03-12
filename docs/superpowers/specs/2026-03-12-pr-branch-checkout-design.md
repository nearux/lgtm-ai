# PR Branch Checkout API Design

## Summary
Add a backend API that checks out the Git branch for a specific PR in a project's working directory.

The API should block checkout when local changes exist by default, and support a `force` mode that automatically stashes all local changes including untracked files before checkout.

## Goals
- Provide one backend endpoint to switch to the branch associated with a PR.
- Prevent accidental context switching when the working tree is dirty.
- Support safe forced switching with automatic stash.

## Non-goals
- Frontend changes.
- Automatic stash apply/pop after checkout.
- Multi-remote fallback logic beyond existing `origin` behavior.

## API Contract
- Method/Path: `POST /api/projects/{projectId}/prs/{prNumber}/checkout`
- Request body: `{ force?: boolean }` (default `false`)
- Success response:
  - `success: true`
  - `message: string`
  - `targetBranch: string`
  - `stashed: boolean`

## Architecture
- Controller: add a checkout endpoint in `ProjectsController`.
- Service: add `checkoutPRBranch(...)` in `backend/services/pullRequests.ts`.
- Repo resolution: reuse `projectsService.resolveGitHubRepo(...)`.
- Branch discovery: `gh pr view --json headRefName`.
- Local git ops: run with project `working_dir` as `cwd`.

## Data Flow
1. Validate `projectId` and `prNumber` via existing controller patterns.
2. Resolve `owner/repo` from project + selected remote.
3. Resolve project working directory.
4. Fetch PR head branch via `gh pr view <prNumber> --repo <owner/repo> --json headRefName`.
5. Check dirty state via `git status --porcelain --untracked-files=normal`.
6. If dirty and `force` is false: return `409 Conflict`.
7. If dirty and `force` is true: run `git stash push --include-untracked -m "lgtmai: auto-stash before PR #<prNumber> checkout"`.
8. Checkout target branch:
   - primary: `git checkout <branch>`
   - fallback: `git fetch --all --prune` + `git checkout -b <branch> --track origin/<branch>`
9. Return success payload with `stashed` flag.

## Error Handling
- `400 Bad Request`: invalid UUID/body validation.
- `404 Not Found`: project not found or PR not found.
- `409 Conflict`: dirty working tree and `force` not enabled.
- `503 Service Unavailable`: gh unavailable/authentication issues.
- `500 Internal Server Error`: stash/checkout/fetch unexpected failures.

## Testing Strategy
Add service tests for:
- clean working tree checkout success (`stashed=false`)
- dirty + force true => stash + checkout (`stashed=true`)
- dirty + force false => `409`
- PR not found => `404`
- GH auth unavailable => `503`
- checkout + fallback failure => `500`

Validate command order/arguments (`git status`, `git stash`, `git checkout`, fetch fallback).

## Notes
- Keep implementation aligned with existing patterns (`AppError`, `execFileAsync`, `tsoa` controller annotations).
- Keep changes isolated to backend (`frontend` untouched).

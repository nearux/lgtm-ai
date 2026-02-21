# Project Overview

LGTM AI automates PR review application using Claude Code. This is a pnpm workspaces monorepo with three packages: `cli`, `backend`, `frontend`.

# Common Commands

```bash
# Build all workspaces
pnpm run build

# Development (backend + frontend with file watching)
pnpm run dev

# Run CLI from source
pnpm start

# Build and run specific workspace
pnpm --filter @lgtmai/cli build
pnpm --filter @lgtmai/backend dev
```

# Architecture

**IMPORTANT**: This is a monorepo. The CLI orchestrates backend (Express on :5051) and frontend (Vite on :5050) as child processes.

- `cli/`: Validates `gh` and `claude` CLIs, launches servers, opens browser
- `backend/`: Express API server (proxied via `/api` in frontend)
- `frontend/`: React 19 + Vite UI

Port config in `cli/utils/ports.ts`. Frontend proxies `/api/*` to backend.

# Prerequisites

The CLI requires these tools installed and authenticated:
- GitHub CLI (`gh auth login`)
- Claude Code CLI

# Publishing

`bin/lgtmai.js` wraps `cli/dist/index.js`. `prepublishOnly` builds all workspaces.

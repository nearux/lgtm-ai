# Project Overview

LGTM AI automates PR review using Claude Code. pnpm workspaces monorepo: `cli`, `backend`, `frontend`.

# Common Commands

```bash
pnpm run build          # Build all workspaces
pnpm run dev            # Backend + frontend with file watching
pnpm start              # Run CLI from source
pnpm test               # Run tests (all packages)

pnpm --filter @lgtmai/cli build
pnpm --filter @lgtmai/backend dev
```

# Architecture

The CLI orchestrates backend (Express :5051) and frontend (Vite :5050) as child processes. Frontend proxies `/api/*` to backend.

- `cli/`: Validates `gh`/`claude` CLIs, launches servers, opens browser. Port config: `cli/utils/ports.ts`
- `backend/`: Express + tsoa API server.
- `frontend/`: React 19 + Vite UI.

# Prerequisites

- GitHub CLI (`gh auth login`)
- Claude Code CLI

# Publishing

`bin/lgtmai.js` wraps `cli/dist/index.js`. `prepublishOnly` builds all workspaces.

# GitHub Write Actions Policy

Never perform GitHub write actions (creating PRs/comments/issues, committing, pushing, etc.) unless explicitly instructed in the immediately preceding user message. Always ask first.

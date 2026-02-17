# Project Overview

LGTM AI automates PR review application using Claude Code. This is an npm workspaces monorepo with three packages: `cli`, `backend`, `frontend`.

# Common Commands

```bash
# Build all workspaces
npm run build

# Development (backend + frontend with file watching)
npm run dev

# Run CLI from source
npm start

# Build and run specific workspace
npm run build -w cli
npm run dev -w backend
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

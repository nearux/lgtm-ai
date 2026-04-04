# LGTM AI

Automate PR review application with Claude Code.

Browse GitHub PR review comments and apply code changes in real-time using Claude Code.

## Getting Started

### Prerequisites

- Node.js 20.19, 22.12, or 24.0+
- [GitHub CLI](https://cli.github.com/) (authenticated via `gh auth login`)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) (installed and configured)

### Run

```bash
npx lgtmai
```

This automatically opens a browser and launches the UI.

## Features

- **PR Browsing** — Browse and view PR lists and details from GitHub repositories
- **Claude Code Execution** — Run Claude Code with PR review context to automatically apply code changes
- **Real-time Streaming** — Stream Claude Code output in real-time via WebSocket
- **Chat Session Persistence** — Save and replay conversation history per PR
- **PR Branch Checkout** — Switch to a PR branch directly from the UI (with stash support)
- **Multi-project Management** — Register and manage multiple local git repositories

## How to Use

1. Run `npx lgtmai`
2. Add a project (local git repository)
3. Select a PR to review from the PR list
4. Enter a prompt for Claude Code (review comments are automatically included as context)
5. Watch the execution results stream in real-time

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PATH` | `~/.lgtmai/lgtmai.db` | SQLite database file path |
| `PORT` | `5051` | Backend server port |

## Architecture

pnpm workspaces monorepo.

```
npx lgtmai (CLI)
├── backend/   Express API server (port 5051)
│              ├── GitHub CLI integration (gh api)
│              ├── Claude Code CLI integration (claude)
│              └── SQLite DB (Prisma + LibSQL)
└── frontend/  React 19 + Vite UI (port 5050)
               └── /api/* → proxied to backend
```

| Package | Role |
|---------|------|
| `cli/` | Prerequisite validation, server launch, browser open |
| `backend/` | REST API + WebSocket server |
| `frontend/` | React UI |

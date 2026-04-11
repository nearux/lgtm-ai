# Backend Architecture

Express + tsoa + Prisma (SQLite via libsql).

## Structure

Flat structure — no `src/` directory. Key folders:

- `controllers/` — tsoa route controllers
- `services/` — pure functions (no classes)
- `repositories/` — DB access functions
- `types/` — shared types exported from `types/index.ts`
- `prisma/` — schema and migrations

## tsoa

Controllers use decorators (`@Route`, `@Get`, `@Post`, etc.) and extend `Controller` from `@tsoa/runtime`.

**IMPORTANT**: Always import from `@tsoa/runtime`, never from `tsoa`. The `tsoa` package is build-time only and excluded from the esbuild bundle.

Build pipeline: `tsoa spec && tsoa routes` → esbuild. Routes and Swagger are auto-generated — run tsoa before building.

## Database

SQLite via Prisma + libsql adapter. Schema: `prisma/schema.prisma`.

- Default DB path: `~/.lgtmai/lgtmai.db` (override with `DB_PATH` env var)
- Dev: `prisma migrate dev` | Prod: `prisma migrate deploy`

## Error Handling

Use `AppError` (with `statusCode`) for HTTP errors. The error middleware also catches tsoa's `ValidateError` and returns consistent JSON responses.

## WebSocket

`/api/claude/execute` streams Claude Code execution using the `ws` library.
Messages from client: `execute`, `followUp`, `abort`, `approval_response`, `plan_approval_response`.
Messages from server: `text`, `tool_message`, `tool_result`, `done`, `error`, `approval_request`, `file_changes`, etc.

## Testing

Vitest. Unit tests: `.test.ts`. Integration tests: `.int.test.ts` (use `createTestDatabase()` from `test/prismaTestDb.ts` for isolated DB instances).

# Backend Architecture

Express + tsoa + Prisma (SQLite via libsql) with Inversify DI.

## Structure

Flat structure — no `src/` directory. Nest-style domain modules under `modules/`:

- `modules/<domain>/` — one folder per domain (`auth/`, `files/`, `projects/`). Files follow the convention:
  - `*.controller.ts` — tsoa route controllers (discovered by `controllerPathGlobs`)
  - `*.service.ts` — business logic as `@injectable()` classes
  - `*.repository.ts` — DB access as `@injectable()` classes
  - `*.util.ts` — pure helpers (no DI)
  - `*.module.ts` — binds this domain's classes into the Inversify container
- `types/` — shared types exported from `types/index.ts`
- `prisma/` — schema and migrations
- `container.ts` / `container-tokens.ts` / `ioc.ts` — DI wiring (see below)

Legacy not yet migrated (Phase 3):

- `controllers/ClaudeWSController.ts` — WebSocket controller, not a tsoa REST controller
- `services/claude/` — Claude Code execution/session management
- `services/promptBuilder.ts`, `services/promptTemplates.ts` — prompt assembly
- `services/chatSessions.ts`, `services/git.ts` — thin shims that delegate to DI-managed services, for consumers not yet migrated

## Dependency Injection

Inversify. Classes declare dependencies with `@injectable()` and `@inject(...)`; each domain's `*.module.ts` registers its bindings into the shared `container` from `container.ts`.

- `container-tokens.ts` holds shared symbol tokens (e.g. `PRISMA_CLIENT`) so modules can import tokens without pulling in the full container graph (avoids a cycle: container → module → repository → container).
- `ioc.ts` exposes the container to tsoa via `iocContainer.get`. `tsoa.json` points to it with `"iocModule": "./ioc"`, so tsoa resolves controllers through Inversify.
- To add a new dependency: decorate the class with `@injectable()`, bind it in the appropriate `*.module.ts`, and inject it via constructor parameter.

## tsoa

Controllers use decorators (`@Route`, `@Get`, `@Post`, etc.) and extend `Controller` from `@tsoa/runtime`.

**IMPORTANT**: Always import from `@tsoa/runtime`, never from `tsoa`. The `tsoa` package is build-time only and excluded from the esbuild bundle.

Build pipeline: `tsoa routes` → esbuild. In dev, `tsoa spec` also runs to generate `swagger.json` (swagger is not served in production). Routes are auto-generated — run `tsoa routes` before building. `controllerPathGlobs` is `modules/**/*.controller.ts`.

## Database

SQLite via Prisma + libsql adapter. Schema: `prisma/schema.prisma`.

- Default DB path: `~/.lgtmai/lgtmai.db` (override with `DB_PATH` env var)
- Dev: `prisma migrate dev` | Prod: `prisma migrate deploy`
- `PrismaClient` is bound in `container.ts` under the `PRISMA_CLIENT` token; repositories inject it with `@inject(PRISMA_CLIENT)`.

## Conventions

- Order methods by caller → callee (top-down readability); public methods above private. When a caller invokes multiple callees, place the callees in the same order they are invoked.
- Prefer declarative, functional programming style using remeda for data transformation logic.

## Error Handling

Use `AppError` (with `statusCode`) for HTTP errors. The error middleware also catches tsoa's `ValidateError` and returns consistent JSON responses.

## WebSocket

`/api/claude/execute` streams Claude Code execution using the `ws` library. Wired by `controllers/ClaudeWSController.ts` (not a tsoa controller — hand-registered in `index.ts`).
Messages from client: `execute`, `followUp`, `abort`, `approval_response`, `plan_approval_response`.
Messages from server: `text`, `tool_message`, `tool_result`, `done`, `error`, `approval_request`, `file_changes`, etc.

## Testing

Vitest. Unit tests: `.test.ts` (co-located under `modules/<domain>/`). Integration tests: `.int.test.ts` (use `createTestDatabase()` from `test/prismaTestDb.ts` for isolated DB instances).

- When adding tests, always review at the end to ensure there are no excessive or duplicate test cases.

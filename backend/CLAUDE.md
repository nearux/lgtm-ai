# Backend Architecture

Express + tsoa + Prisma (SQLite via libsql) with Inversify DI.

## Structure

Flat structure — no `src/` directory. Nest-style domain modules under `modules/`:

- `modules/<domain>/` — one folder per domain (`auth/`, `files/`, `projects/`, `claude/`). Files follow the convention:
  - `*.controller.ts` — tsoa route controllers (discovered by `controllerPathGlobs`)
  - `*.service.ts` — business logic as `@injectable()` classes
  - `*.repository.ts` — DB access as `@injectable()` classes
  - `*.util.ts` — pure helpers (no DI)
  - `*.module.ts` — binds this domain's classes into the Inversify container
- `types/` — shared types exported from `types/index.ts`
- `prisma/` — schema and migrations
- `core/` — app bootstrap and infrastructure: `app.ts`, `container.ts`, `container-tokens.ts`, `ioc.ts`, `middlewares/`

Domains: `auth/`, `files/`, `projects/`, `claude/`. The `claude` module holds the WebSocket controller (`claude-ws.controller.ts`) and Claude Code process management; unlike REST modules, its controller is resolved manually in `backend/index.ts` since tsoa does not handle WebSocket routes.

## Dependency Injection

Inversify. Classes declare dependencies with `@injectable()` and `@inject(...)`; each domain's `*.module.ts` registers its bindings into the shared `container` from `core/container.ts`.

- `core/container-tokens.ts` holds shared symbol tokens (e.g. `PRISMA_CLIENT`) so modules can import tokens without pulling in the full container graph (avoids a cycle: container → module → repository → container).
- `core/ioc.ts` exposes the container to tsoa via `iocContainer.get`. `tsoa.json` points to it with `"iocModule": "./core/ioc"`, so tsoa resolves controllers through Inversify.
- To add a new dependency: decorate the class with `@injectable()`, bind it in the appropriate `*.module.ts`, and inject it via constructor parameter.

## tsoa

**IMPORTANT**: Always import from `@tsoa/runtime`, never from `tsoa`. The `tsoa` package is build-time only and excluded from the esbuild bundle.

Controllers use decorators (`@Route`, `@Get`, `@Post`, etc.) and extend `Controller` from `@tsoa/runtime`.

Build pipeline: `tsoa routes` → esbuild. In dev, `tsoa spec` also runs to generate `swagger.json` (swagger is not served in production). Routes are auto-generated — run `tsoa routes` before building. `controllerPathGlobs` is `modules/**/*.controller.ts`.

## Database

SQLite via Prisma + libsql adapter. Schema: `prisma/schema.prisma`.

- Default DB path: `~/.lgtmai/lgtmai.db` (override with `DB_PATH` env var)
- Dev: `prisma migrate dev` | Prod: `prisma migrate deploy`
- `PrismaClient` is bound in `core/container.ts` under the `PRISMA_CLIENT` token; repositories inject it with `@inject(PRISMA_CLIENT)`.

## Conventions

- Order methods by caller → callee (top-down readability). When a caller invokes multiple callees, place the callees in the same order they are invoked.
- For data transformation (map/filter/groupBy chains, collection shaping), prefer remeda over hand-rolled loops or lodash.

## Error Handling

Use `AppError` (with `statusCode`) for HTTP errors. The error middleware also catches tsoa's `ValidateError` and returns consistent JSON responses.

## WebSocket

`/api/claude/execute` streams Claude Code execution using the `ws` library. Wired by `modules/claude/claude-ws.controller.ts` (not a tsoa controller — resolved from the Inversify container and hand-registered in `index.ts`).
Messages from client: `execute`, `followUp`, `abort`, `approval_response`, `plan_approval_response`.
Messages from server: `text`, `tool_message`, `tool_result`, `done`, `error`, `approval_request`, `file_changes`, etc.

## Testing

Vitest. Unit tests: `.test.ts` (co-located under `modules/<domain>/`). Integration tests: `.int.test.ts` (use `createTestDatabase()` from `test/prismaTestDb.ts` for isolated DB instances).

- Avoid duplicate coverage: if two tests exercise the same branch of the same function with only cosmetic differences, keep the clearer one.

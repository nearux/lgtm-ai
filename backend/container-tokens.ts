// backend/container-tokens.ts
// Shared DI tokens. Lives outside container.ts to avoid circular imports
// (repositories/services import this; container.ts imports modules that
// depend on repositories/services).

export const PRISMA_CLIENT = Symbol.for('PrismaClient');

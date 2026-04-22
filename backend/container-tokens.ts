// DI tokens kept in their own file so modules (repositories, services) can
// import them without pulling in the full container graph — this breaks the
// otherwise-inevitable cycle: container → module → repository → container.
export const PRISMA_CLIENT = Symbol.for('PrismaClient');

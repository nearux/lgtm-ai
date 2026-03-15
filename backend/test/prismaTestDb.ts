import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createClient } from '@libsql/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '@prisma/client';

export type TestDatabase = {
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
};

const migrationsRoot = fileURLToPath(
  new URL('../prisma/migrations', import.meta.url)
);

function loadMigrationSql(): string {
  const migrationDirs = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  return migrationDirs
    .map((dirName) => {
      const migrationPath = path.join(migrationsRoot, dirName, 'migration.sql');
      return readFileSync(migrationPath, 'utf8');
    })
    .join('\n');
}

const migrationSql = loadMigrationSql();

export async function createTestDatabase(): Promise<TestDatabase> {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'lgtmai-backend-test-'));
  const dbPath = path.join(tempDir, 'test.db');
  const url = `file:${dbPath}`;

  const bootstrapClient = createClient({ url });
  await bootstrapClient.executeMultiple(migrationSql);
  bootstrapClient.close();

  const adapter = new PrismaLibSql({ url });
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  return {
    prisma,
    cleanup: async () => {
      await prisma.$disconnect();
      rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

export async function clearDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.chatSession.deleteMany();
  await prisma.project.deleteMany();
}

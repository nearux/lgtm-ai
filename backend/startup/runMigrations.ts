import { execFile } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

type ExecFileAsync = (
  file: string,
  args: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
) => Promise<unknown>;

interface RunStartupMigrationsOptions {
  backendRoot?: string;
  prismaCliPath?: string;
  schemaPath?: string;
  configPath?: string;
  execFileAsync?: ExecFileAsync;
}

const execFileAsyncDefault = promisify(execFile) as ExecFileAsync;
const require = createRequire(import.meta.url);

function resolveBackendRoot(explicitRoot?: string): string {
  if (explicitRoot) return explicitRoot;
  return join(dirname(fileURLToPath(import.meta.url)), '..');
}

function resolvePrismaCliPath(backendRoot: string, explicitPath?: string): string {
  if (explicitPath) return explicitPath;
  const prismaPackageJson = require.resolve('prisma/package.json', {
    paths: [backendRoot],
  });
  return join(dirname(prismaPackageJson), 'build', 'index.js');
}

export async function runStartupMigrations(
  options: RunStartupMigrationsOptions = {}
): Promise<void> {
  const backendRoot = resolveBackendRoot(options.backendRoot);
  const dbDir = join(os.homedir(), '.lgtmai');
  mkdirSync(dbDir, { recursive: true });

  const schemaPath =
    options.schemaPath ?? join(backendRoot, 'prisma', 'schema.prisma');
  const configPath = options.configPath ?? join(backendRoot, 'prisma.config.ts');
  const prismaCliPath = resolvePrismaCliPath(backendRoot, options.prismaCliPath);
  const execAsync = options.execFileAsync ?? execFileAsyncDefault;

  const args = [
    prismaCliPath,
    'migrate',
    'deploy',
    '--schema',
    schemaPath,
    '--config',
    configPath,
  ];

  try {
    await execAsync(process.execPath, args, {
      cwd: backendRoot,
      env: process.env,
    });
  } catch (error) {
    throw new Error('Failed to apply startup database migrations', {
      cause: error,
    });
  }
}

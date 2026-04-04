import { describe, expect, it, vi } from 'vitest';
import { runStartupMigrations } from './runMigrations.js';

describe('runStartupMigrations', () => {
  it('runs prisma migrate deploy before serving requests', async () => {
    const execFileAsync = vi.fn().mockResolvedValue(undefined);

    await runStartupMigrations({
      backendRoot: '/tmp/lgtmai/backend',
      prismaCliPath: '/tmp/lgtmai/node_modules/prisma/build/index.js',
      schemaPath: '/tmp/lgtmai/backend/prisma/schema.prisma',
      configPath: '/tmp/lgtmai/backend/prisma.config.ts',
      execFileAsync,
    });

    expect(execFileAsync).toHaveBeenCalledTimes(1);
    expect(execFileAsync).toHaveBeenCalledWith(
      process.execPath,
      [
        '/tmp/lgtmai/node_modules/prisma/build/index.js',
        'migrate',
        'deploy',
        '--schema',
        '/tmp/lgtmai/backend/prisma/schema.prisma',
        '--config',
        '/tmp/lgtmai/backend/prisma.config.ts',
      ],
      {
        cwd: '/tmp/lgtmai/backend',
        env: process.env,
      }
    );
  });

  it('throws a startup error when migrate deploy fails', async () => {
    const execFileAsync = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(
      runStartupMigrations({
        backendRoot: '/tmp/lgtmai/backend',
        prismaCliPath: '/tmp/lgtmai/node_modules/prisma/build/index.js',
        execFileAsync,
      })
    ).rejects.toThrow('Failed to apply startup database migrations');
  });
});

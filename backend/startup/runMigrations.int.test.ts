import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runStartupMigrations } from './runMigrations.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

async function createExecutableJs(filePath: string, script: string): Promise<void> {
  await writeFile(filePath, script, { mode: 0o755 });
}

describe('runStartupMigrations (integration)', () => {
  it('invokes prisma cli via real child_process execution', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'lgtmai-runmigrations-'));
    tempDirs.push(tempDir);

    const backendRoot = path.join(tempDir, 'backend');
    const prismaCliPath = path.join(tempDir, 'fake-prisma.js');
    const markerPath = path.join(tempDir, 'invocation.txt');
    const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');
    const configPath = path.join(backendRoot, 'prisma.config.ts');
    await mkdir(backendRoot, { recursive: true });

    await createExecutableJs(
      prismaCliPath,
      [
        "import { writeFileSync } from 'node:fs';",
        `writeFileSync('${markerPath}', process.argv.slice(2).join(' '));`,
      ].join('\n')
    );

    await runStartupMigrations({
      backendRoot,
      prismaCliPath,
      schemaPath,
      configPath,
    });

    const invocation = await readFile(markerPath, 'utf-8');
    expect(invocation).toContain('migrate deploy');
    expect(invocation).toContain(`--schema ${schemaPath}`);
    expect(invocation).toContain(`--config ${configPath}`);
  });

  it('wraps errors from child_process execution', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'lgtmai-runmigrations-'));
    tempDirs.push(tempDir);

    const backendRoot = path.join(tempDir, 'backend');
    const prismaCliPath = path.join(tempDir, 'fake-prisma-fail.js');
    await mkdir(backendRoot, { recursive: true });

    await createExecutableJs(
      prismaCliPath,
      [
        "import process from 'node:process';",
        "console.error('intentional failure');",
        'process.exit(1);',
      ].join('\n')
    );

    await expect(
      runStartupMigrations({
        backendRoot,
        prismaCliPath,
      })
    ).rejects.toThrow('Failed to apply startup database migrations');
  });
});

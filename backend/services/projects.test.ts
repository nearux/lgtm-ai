import { randomUUID } from 'node:crypto';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { Prisma, PrismaClient } from '@prisma/client';
import { clearDatabase, createTestDatabase } from '../test/prismaTestDb.js';

const mockExistsSync = vi.fn();
const mockExecFileAsync = vi.fn();

let prisma: PrismaClient;
let cleanupDb: (() => Promise<void>) | null = null;
let projectsService: typeof import('./projects.js');

async function seedProject(
  overrides: Partial<Prisma.ProjectUncheckedCreateInput> = {}
) {
  const now = new Date();

  return prisma.project.create({
    data: {
      id: randomUUID(),
      name: 'LGTM AI',
      description: 'Code review helper',
      working_dir: '/tmp/project',
      created_at: now,
      updated_at: now,
      ...overrides,
    },
  });
}

beforeAll(async () => {
  vi.resetModules();

  const testDb = await createTestDatabase();
  prisma = testDb.prisma;
  cleanupDb = testDb.cleanup;

  vi.doMock('../prismaClient.js', () => ({ default: prisma }));
  vi.doMock('node:fs', () => ({ existsSync: mockExistsSync }));
  vi.doMock('node:util', () => ({
    promisify: () => mockExecFileAsync,
  }));

  projectsService = await import('./projects.js');
});

afterAll(async () => {
  if (cleanupDb) {
    await cleanupDb();
  }
});

beforeEach(async () => {
  vi.clearAllMocks();
  await clearDatabase(prisma);
});

describe('projects service', () => {
  it('creates project with trimmed fields and persists it in sqlite', async () => {
    mockExistsSync.mockReturnValue(true);

    const result = await projectsService.create({
      name: '  LGTM AI  ',
      description: '  Code review helper  ',
      working_dir: '  /tmp/project  ',
    });

    const persisted = await prisma.project.findUnique({
      where: { id: result.id },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.name).toBe('LGTM AI');
    expect(persisted?.description).toBe('Code review helper');
    expect(persisted?.working_dir).toBe('/tmp/project');
    expect(result.id).toBe(persisted?.id);
  });

  it('throws when creating project with non-existing working directory', async () => {
    mockExistsSync.mockReturnValue(false);

    await expect(
      projectsService.create({
        name: 'LGTM AI',
        description: 'desc',
        working_dir: '/tmp/missing',
      })
    ).rejects.toMatchObject({
      message: 'working_dir does not exist on the filesystem',
      statusCode: 422,
    });
  });

  it('lists all projects from sqlite ordered by created_at desc', async () => {
    const older = new Date('2026-03-01T00:00:00.000Z');
    const newer = new Date('2026-03-02T00:00:00.000Z');

    const first = await seedProject({
      id: 'project-old',
      created_at: older,
      updated_at: older,
    });
    const second = await seedProject({
      id: 'project-new',
      created_at: newer,
      updated_at: newer,
    });

    const result = await projectsService.findAll();

    expect(result.map((project) => project.id)).toEqual([second.id, first.id]);
  });

  it('returns project detail with git info, running all git calls in parallel', async () => {
    const project = await seedProject({
      id: 'project-1',
      working_dir: '/tmp/project',
    });

    // Mock by inspecting git subcommand args — order-independent for parallel calls
    mockExecFileAsync.mockImplementation((_cmd: string, args: string[]) => {
      const sub = args.join(' ');
      if (sub.includes('remote get-url origin')) {
        return Promise.resolve({ stdout: 'git@github.com:owner/repo.git\n' });
      }
      if (sub.includes('remote -v')) {
        return Promise.resolve({
          stdout:
            'origin\tgit@github.com:owner/repo.git (fetch)\norigin\tgit@github.com:owner/repo.git (push)\nupstream\thttps://github.com/base/repo.git (fetch)\n',
        });
      }
      if (sub.includes('branch --show-current')) {
        return Promise.resolve({ stdout: 'feature/my-branch\n' });
      }
      if (sub.includes('branch') && !sub.includes('--show-current')) {
        return Promise.resolve({ stdout: '* feature/my-branch\n  main\n' });
      }
      return Promise.resolve({ stdout: '' });
    });

    const result = await projectsService.findById(project.id);

    // All 4 git calls must still be made
    expect(mockExecFileAsync).toHaveBeenCalledTimes(4);
    expect(result).toEqual({
      ...project,
      gitInfo: {
        remoteUrl: 'git@github.com:owner/repo.git',
        currentBranch: 'feature/my-branch',
        branches: ['feature/my-branch', 'main'],
        remotes: [
          { name: 'origin', url: 'git@github.com:owner/repo.git' },
          { name: 'upstream', url: 'https://github.com/base/repo.git' },
        ],
      },
    });
  });

  it('throws not found when project does not exist', async () => {
    await expect(
      projectsService.findById('missing-project')
    ).rejects.toMatchObject({
      message: 'Project not found',
      statusCode: 404,
    });
  });

  it('updates project with trimmed fields and persists changes in sqlite', async () => {
    const project = await seedProject({
      id: 'project-1',
      description: 'Initial',
      working_dir: '/tmp/project',
    });
    mockExistsSync.mockReturnValue(true);

    const result = await projectsService.update(project.id, {
      name: '  New Name  ',
      description: '   ',
      working_dir: '  /tmp/next  ',
    });

    const persisted = await prisma.project.findUnique({
      where: { id: project.id },
    });

    expect(result.name).toBe('New Name');
    expect(result.description).toBeNull();
    expect(result.working_dir).toBe('/tmp/next');
    expect(persisted?.name).toBe('New Name');
    expect(persisted?.description).toBeNull();
    expect(persisted?.working_dir).toBe('/tmp/next');
  });

  it('throws when updating to non-existing working directory', async () => {
    const project = await seedProject({ id: 'project-1' });
    mockExistsSync.mockReturnValue(false);

    await expect(
      projectsService.update(project.id, { working_dir: '/tmp/missing' })
    ).rejects.toMatchObject({
      message: 'working_dir does not exist on the filesystem',
      statusCode: 422,
    });
  });

  it('removes existing project from sqlite', async () => {
    const project = await seedProject({ id: 'project-1' });

    await projectsService.remove(project.id);

    const persisted = await prisma.project.findUnique({
      where: { id: project.id },
    });
    expect(persisted).toBeNull();
  });

  it('resolves GitHub repository using a single git remote get-url call', async () => {
    const project = await seedProject({
      id: 'project-1',
      working_dir: '/tmp/project',
    });

    mockExecFileAsync.mockResolvedValueOnce({
      stdout: 'https://github.com/org/repo.git\n',
    });

    const result = await projectsService.resolveGitHubRepo(project.id, 'team');

    expect(result).toBe('org/repo');
    // Must make exactly one git call — no full getGitInfo traversal
    expect(mockExecFileAsync).toHaveBeenCalledTimes(1);
    expect(mockExecFileAsync).toHaveBeenCalledWith(
      'git',
      ['remote', 'get-url', 'team'],
      expect.objectContaining({ cwd: '/tmp/project' })
    );
  });

  it('throws BAD_REQUEST when remoteName contains argument injection characters', async () => {
    const project = await seedProject({
      id: 'project-1',
      working_dir: '/tmp/project',
    });

    await expect(
      projectsService.resolveGitHubRepo(project.id, '--upload-pack=malicious')
    ).rejects.toMatchObject({
      message: 'Invalid remote name',
      statusCode: 400,
    });

    // git must not be called at all
    expect(mockExecFileAsync).not.toHaveBeenCalled();
  });

  it('throws BAD_REQUEST when remoteName contains spaces', async () => {
    const project = await seedProject({
      id: 'project-1',
      working_dir: '/tmp/project',
    });

    await expect(
      projectsService.resolveGitHubRepo(project.id, 'origin; rm -rf /')
    ).rejects.toMatchObject({
      message: 'Invalid remote name',
      statusCode: 400,
    });

    expect(mockExecFileAsync).not.toHaveBeenCalled();
  });
});

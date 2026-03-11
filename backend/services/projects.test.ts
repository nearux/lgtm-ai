import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../types/projects.js';

const mockExistsSync = vi.hoisted(() => vi.fn());
const mockExecFileAsync = vi.hoisted(() => vi.fn());
const mockProjectRepository = vi.hoisted(() => ({
  create: vi.fn(),
  findAll: vi.fn(),
  findById: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
}));

vi.mock('node:util', () => ({
  promisify: () => mockExecFileAsync,
}));

vi.mock('../repositories/projectRepository.js', () => ({
  ...mockProjectRepository,
}));

const {
  create,
  findAll,
  findById,
  remove,
  resolveGitHubRepo,
  update,
} = await import('./projects.js');

describe('projects service', () => {
  const now = new Date('2026-03-11T00:00:00.000Z');

  const project: Project = {
    id: 'project-1',
    name: 'LGTM AI',
    description: 'Code review helper',
    working_dir: '/tmp/project',
    created_at: now,
    updated_at: now,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates project with trimmed fields', async () => {
    mockExistsSync.mockReturnValue(true);
    mockProjectRepository.create.mockResolvedValue(project);

    const result = await create({
      name: '  LGTM AI  ',
      description: '  Code review helper  ',
      working_dir: '  /tmp/project  ',
    });

    expect(mockProjectRepository.create).toHaveBeenCalledWith({
      id: expect.any(String),
      name: 'LGTM AI',
      description: 'Code review helper',
      working_dir: '/tmp/project',
      created_at: now,
      updated_at: now,
    });
    expect(result).toEqual(project);
  });

  it('throws when creating project with non-existing working directory', async () => {
    mockExistsSync.mockReturnValue(false);

    await expect(
      create({
        name: 'LGTM AI',
        description: 'desc',
        working_dir: '/tmp/missing',
      })
    ).rejects.toMatchObject({
      message: 'working_dir does not exist on the filesystem',
      statusCode: 422,
    });
  });

  it('lists all projects', async () => {
    mockProjectRepository.findAll.mockResolvedValue([project]);

    const result = await findAll();

    expect(mockProjectRepository.findAll).toHaveBeenCalledWith();
    expect(result).toEqual([project]);
  });

  it('returns project detail with git info', async () => {
    mockProjectRepository.findById.mockResolvedValue(project);
    mockExecFileAsync
      .mockResolvedValueOnce({ stdout: 'git@github.com:owner/repo.git\n' })
      .mockResolvedValueOnce({
        stdout:
          'origin\tgit@github.com:owner/repo.git (fetch)\norigin\tgit@github.com:owner/repo.git (push)\nupstream\thttps://github.com/base/repo.git (fetch)\n',
      })
      .mockResolvedValueOnce({ stdout: 'feature/my-branch\n' })
      .mockResolvedValueOnce({
        stdout: '* feature/my-branch\n  main\n',
      });

    const result = await findById('project-1');

    expect(mockProjectRepository.findById).toHaveBeenCalledWith('project-1');
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
    mockProjectRepository.findById.mockResolvedValue(null);

    await expect(findById('project-1')).rejects.toMatchObject({
      message: 'Project not found',
      statusCode: 404,
    });
  });

  it('updates project with trimmed fields', async () => {
    mockProjectRepository.findById.mockResolvedValue(project);
    mockExistsSync.mockReturnValue(true);
    mockProjectRepository.updateById.mockResolvedValue({
      ...project,
      name: 'New Name',
      description: null,
      working_dir: '/tmp/next',
      updated_at: now,
    });

    const result = await update('project-1', {
      name: '  New Name  ',
      description: '   ',
      working_dir: '  /tmp/next  ',
    });

    expect(mockProjectRepository.updateById).toHaveBeenCalledWith('project-1', {
      name: 'New Name',
      description: null,
      working_dir: '/tmp/next',
      updated_at: now,
    });
    expect(result.name).toBe('New Name');
  });

  it('throws when updating to non-existing working directory', async () => {
    mockProjectRepository.findById.mockResolvedValue(project);
    mockExistsSync.mockReturnValue(false);

    await expect(
      update('project-1', { working_dir: '/tmp/missing' })
    ).rejects.toMatchObject({
      message: 'working_dir does not exist on the filesystem',
      statusCode: 422,
    });
  });

  it('removes existing project', async () => {
    mockProjectRepository.findById.mockResolvedValue(project);

    await remove('project-1');

    expect(mockProjectRepository.deleteById).toHaveBeenCalledWith('project-1');
  });

  it('resolves GitHub repository by remote name', async () => {
    mockProjectRepository.findById.mockResolvedValue(project);
    mockExecFileAsync
      .mockResolvedValueOnce({ stdout: 'git@github.com:owner/repo.git\n' })
      .mockResolvedValueOnce({
        stdout:
          'origin\tgit@github.com:owner/repo.git (fetch)\norigin\tgit@github.com:owner/repo.git (push)\nteam\thttps://github.com/org/repo.git (fetch)\n',
      })
      .mockResolvedValueOnce({ stdout: 'feature/my-branch\n' })
      .mockResolvedValueOnce({ stdout: '* feature/my-branch\n  main\n' });

    const result = await resolveGitHubRepo('project-1', 'team');

    expect(result).toBe('org/repo');
  });
});

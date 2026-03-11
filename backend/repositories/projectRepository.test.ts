import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  project: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../prismaClient.js', () => ({
  default: mockPrisma,
}));

const {
  create,
  deleteById,
  findAll,
  findById,
  findWorkingDirectoryById,
  updateById,
} = await import('./projectRepository.js');

describe('projectRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a project', async () => {
    const input = {
      id: 'project-1',
      name: 'LGTM AI',
      description: 'desc',
      working_dir: '/tmp/project',
      created_at: new Date('2026-03-11T00:00:00.000Z'),
      updated_at: new Date('2026-03-11T00:00:00.000Z'),
    };

    await create(input);

    expect(mockPrisma.project.create).toHaveBeenCalledWith({
      data: input,
    });
  });

  it('finds all projects ordered by created_at desc', async () => {
    await findAll();

    expect(mockPrisma.project.findMany).toHaveBeenCalledWith({
      orderBy: { created_at: 'desc' },
    });
  });

  it('finds project by id', async () => {
    await findById('project-1');

    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'project-1' },
    });
  });

  it('finds working directory by project id', async () => {
    await findWorkingDirectoryById('project-1');

    expect(mockPrisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      select: {
        working_dir: true,
      },
    });
  });

  it('updates project by id', async () => {
    const data = {
      name: 'New name',
      description: null,
      working_dir: '/tmp/next',
      updated_at: new Date('2026-03-11T00:00:00.000Z'),
    };

    await updateById('project-1', data);

    expect(mockPrisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data,
    });
  });

  it('deletes project by id', async () => {
    await deleteById('project-1');

    expect(mockPrisma.project.delete).toHaveBeenCalledWith({
      where: { id: 'project-1' },
    });
  });
});

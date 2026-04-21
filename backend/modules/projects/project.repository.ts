// backend/modules/projects/project.repository.ts
import type { Prisma, PrismaClient, Project } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { PRISMA_CLIENT } from '../../container.js';

@injectable()
export class ProjectRepository {
  constructor(@inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async create(data: Prisma.ProjectUncheckedCreateInput): Promise<Project> {
    return this.prisma.project.create({ data });
  }

  async findAll(): Promise<Project[]> {
    return this.prisma.project.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  async findWorkingDirectoryById(id: string): Promise<string | null> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { working_dir: true },
    });
    return project?.working_dir ?? null;
  }

  async updateById(
    id: string,
    data: Prisma.ProjectUncheckedUpdateInput
  ): Promise<Project> {
    return this.prisma.project.update({ where: { id }, data });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }
}
